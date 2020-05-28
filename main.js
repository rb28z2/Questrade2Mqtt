import mqtt from 'mqtt'
import Questrade from 'questrade'

if ("MQTT_HOST" in process.env === false) {
    console.error("No MQTT host was provided! Exiting.")
    process.exit(1);
}

var mqtt_options = {
    host: process.env.MQTT_HOST,
    port: process.env.MQTT_PORT || 1883
}

if ("MQTT_USER" in process.env) {
    mqtt_options.username = process.env.MQTT_USER
    mqtt_options.password = process.env.MQTT_PASS
}
var client = mqtt.connect(mqtt_options)


client.on('connect', () => {
    console.log("Connected to MQTT")
})

// exit if no QT api key was defined
if ("QUESTRADE_API_KEY" in process.env === false){
    console.error("No Questrade API key was provided! Exiting.")
    process.exit(1);
}

var qt = new Questrade(process.env.QUESTRADE_API_KEY)
const publish_topic = process.env.MQTT_PUBLISH_TOPIC || "questrade/positions/"

qt.on('ready', () => {
    qt.getPositions((err, response) => {
        for (var position of response.positions) {
            const topic = publish_topic + position.symbol +'/'
            const keys = [
                'openQuantity',
                'currentMarketValue',
                'currentPrice',
                'averageEntryPrice',
                'dayPnl',
                'openPnl',
                'totalCost'
            ]
            for (var key of keys){
                client.publish(topic + key, position[key].toFixed(2).toString())
            }
            
        }
    })
})