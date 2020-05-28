import mqtt from 'mqtt'
import Questrade from 'questrade'

if ("MQTT_HOST" in process.env === false) {
    console.error("No MQTT host was provided! Exiting.")
    process.exit(1);
}
mqtt_options = {
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

qt.on('ready', () => {
    qt.getPositions((err, positions) => {
        console.log(positions)
    })
})