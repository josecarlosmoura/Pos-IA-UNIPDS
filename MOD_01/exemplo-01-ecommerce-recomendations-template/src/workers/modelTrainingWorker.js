import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

console.log('Model training worker initialized');
let _globalCtx = {};
let _model = null;

const WEIGHTS = {
    category: 0.4,
    color: 0.3,
    price: 0.2,
    age: 0.1
};

const normalize = (value, min, max) => (value - min) / ((max - min) || 1);

function makeContext(products, users){
    const ages = users.map(u => u.age)
    const prices = products.map(p => p.price)

    const minAge = Math.min(...ages)
    const maxAge = Math.max(...ages)

    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    const colors = [...new Set(products.map(p => p.color))]
    const categories = [...new Set(products.map(p => p.category))]

    const colorsIndex = Object.fromEntries(
        colors.map((color, index) => {
            return [color, index]
        })
    )

    const categoriesIndex = Object.fromEntries(
        categories.map((category, index) => {
            return [category, index]
        })
    )

    // Computar a média de idade dos comprados por produto
    // (ajuda a personalizar)
    const midAge = (minAge + maxAge) / 2
    const ageSums = {}
    const ageCounts = {}

    users.forEach(user => {
        user.purchases.forEach(purchase => {
            ageSums[purchase.name] = (ageSums[purchase.name] || 0) + user.age
            ageCounts[purchase.name] = (ageCounts[purchase.name] || 0) + 1
        })
    })

    const productAvgAgeNorm = Object.fromEntries(
        products.map(product => {
            const avg = ageCounts[product.name] ? 
                ageSums[product.name] / ageCounts[product.name] : 
                midAge

            return [product.name, normalize(avg, minAge, maxAge)]
        })
    );

    return {
        products,
        users,
        colorsIndex,
        categoriesIndex,
        productAvgAgeNorm,
        minAge,
        maxAge,
        minPrice,
        maxPrice,
        numCategories: categories.length,
        numColors: colors.length,
        // 2 for age and price, plus the number of categories and colors
        // price + age + colors + categories
        dimensions: 2 + categories.length + colors.length,
    }    
}

const oneHotWeighted = (index, length, weight) =>
    tf.oneHot(index, length).cast('float32').mul(weight)

function encodeProduct(product, ctx) {
    
    const price = tf.tensor1d([
        normalize(
            product.price, 
            ctx.minPrice, 
            ctx.maxPrice
        ) * WEIGHTS.price
    ])

    const age = tf.tensor1d([
        (ctx.productAvgAgeNorm[product.name] ?? 0.5) * WEIGHTS.age
    ])

    // One-hot encoding for category and applying weights
    const category = oneHotWeighted(
        ctx.categoriesIndex[product.category],
        ctx.numCategories,
        WEIGHTS.category
    )

    const color = oneHotWeighted(
        ctx.colorsIndex[product.color],
        ctx.numColors,
        WEIGHTS.color
    )

    return tf.concat1d([price, age, category, color])
}

async function trainModel({ users }) {
    console.log('Training model with users:', users)

    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 50 } });

    const products = await (await fetch('/data/products.json')).json()

    const context = makeContext(products, users)
    
    context.productVectors = products.map(product => {
        return {
            name: product.name,
            meta: {...product},
            vector: encodeProduct(product, context).dataSync()
        }
    })

    _globalCtx = context

    const trainData = createTrainingData(context)
    _model = await configureNeuralNetAndTrain(trainData)

    postMessage({ type: workerEvents.progressUpdate, progress: { 
        progress: 100 } });
    postMessage({ type: workerEvents.trainingComplete });

}

function encodeUser(user, ctx) {
    if(user.purchases.length) {
        return tf.stack(
            user.purchases.map(
                product => encodeProduct(product, ctx)
            )
        )
        .mean(0)
        .reshape([1, ctx.dimensions])
    }

    return tf.concat1d(
        [
            tf.zeros([1]),
            tf.tensor1d([
                normalize(user.age, ctx.minAge, ctx.maxAge) 
                * WEIGHTS.age,
            ]),
            tf.zeros([ctx.numCategories]),
            tf.zeros([ctx.numColors])
        ]
    ).reshape([1, ctx.dimensions])
}

function createTrainingData(ctx) {
    const inputs = []
    const labels = []
    ctx.users
    .filter(user => user.purchases.length > 0)
    .forEach(user => {
        const userVector = encodeUser(user, ctx).dataSync()
        ctx.products.forEach(product => {
            const productVector = encodeProduct(product, ctx).dataSync()
            
            const label = user.purchases.some(p => p.name === product.name ? 1 : 0)

            inputs.push([...userVector, ...productVector])
            labels.push(label)
        })
    })

    return {
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [labels.length, 1]),
        inputDimensions: ctx.dimensions * 2
        // tamanho = user vector + product vector
    }
}

// ====================================================================
// 🧠 Configuração e treinamento da rede neural
// ====================================================================
async function configureNeuralNetAndTrain(trainData) {

    const model = tf.sequential()
    // Camada de entrada
    // - inputShape: Número de features por exemplo de treino (trainData.inputDim)
    //   Exemplo: Se o vetor produto + usuário = 20 números, então inputDim = 20
    // - units: 128 neurônios (muitos "olhos" para detectar padrões)
    // - activation: 'relu' (mantém apenas sinais positivos, ajuda a aprender padrões não-lineares)
    model.add(
        tf.layers.dense({
            inputShape: [trainData.inputDimensions],
            units: 128,
            activation: 'relu'
        })
    )
    // Camada oculta 1
    // - 64 neurônios (menos que a primeira camada: começa a comprimir informação)
    // - activation: 'relu' (ainda extraindo combinações relevantes de features)
    model.add(
        tf.layers.dense({
            units: 64,
            activation: 'relu'
        })
    )

    // Camada oculta 2
    // - 32 neurônios (mais estreita de novo, destilando as informações mais importantes)
    //   Exemplo: De muitos sinais, mantém apenas os padrões mais fortes
    // - activation: 'relu'
    model.add(
        tf.layers.dense({
            units: 32,
            activation: 'relu'
        })
    )
    // Camada de saída
    // - 1 neurônio porque vamos retornar apenas uma pontuação de recomendação
    // - activation: 'sigmoid' comprime o resultado para o intervalo 0–1
    //   Exemplo: 0.9 = recomendação forte, 0.1 = recomendação fraca
    model.add(
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
    )

    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    })

    await model.fit(trainData.xs, trainData.ys, {
        epochs: 100,
        batchSize: 32,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                postMessage({
                    type: workerEvents.trainingLog,
                    epoch: epoch,
                    loss: logs.loss,
                    accuracy: logs.acc
                });
            }
        }
    })

    return model
}


function recommend(user) {
    if (!_model) {
        console.error('Model not trained yet. Cannot recommend.')
        return
    }

    const context = _globalCtx
    const userVector = encodeUser(user, context).dataSync()

    // Todo: Implementar filtragem de produtos antes de passar para o modelo
    // Em aplicações reais:
    // Armazenar os vetores de produtos em um banco de dados ou cache
    // para evitar recalcular a cada recomendação.
    // Consulta: Encontre os 200 produtos mais próximos do vetor do usuário (ex: usando distância euclidiana ou cosseno).
    // Execute _model.predict() apenas nesses produtos filtrados para obter a pontuação final de recomendação.
    const inputs = context.productVectors.map(({vector}) => {
        return [...userVector, ...vector]
    })

    const inputTensor = tf.tensor2d(inputs)
    
    const predictions = _model.predict(inputTensor)
    const scores = predictions.dataSync()

    const recommendedProducts = context.productVectors
        .map((item, index) => {
            return {
                ...item.meta,
                name: item.name,
                score: scores[index]                
            }
        })
        .sort((a, b) => b.score - a.score)        

    postMessage({
        type: workerEvents.recommend,
        user: user,
        recommendations: recommendedProducts
    })
    console.log('will recommend for user:', user)
}


const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: d => recommend(d.user, _globalCtx),
};

self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) handlers[action](data);
};
