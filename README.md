# Questrade2Mqtt

### Usage
To run, pull from Dockerhub using the tag `rb28z2/questrade2mqtt` and provide the following environment variables: `MQTT_HOST` and `QUESTRADE_API_KEY`. Optionally, you can also provide `MQTT_USER` (and `MQTT_PASS`) as well as `MQTT_PORT` if you want to use a port other than the default 1883. You can also provide `REFRESH_INTERVAL` with a number to override the default 5 minute refresh interval. `FORCE_REFRESH` can also be used if you want to force refreshes while the TSX is closed for the day (for things like debugging and after hours trading).

This is the companion/server-side code for a project that displays this information on a small OLED screen powered by a microcontroller. That project is available here: [https://github.com/rb28z2/ESP8266-Questrade-Display](https://github.com/rb28z2/ESP8266-Questrade-Display) 