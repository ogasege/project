#include <NTPClient.h>
#include "secrets.h"
#include "esp_camera.h"
#include <WiFiClientSecure.h>
#include "WiFi.h"
#include <WiFiUdp.h>
#include <EEPROM.h>
//#include <WString.h>

#define EEPROM_SIZE 1
#define LED_BUILTIN 4

// camera definitions
#define CAMERA_MODEL_AI_THINKER
#include "camera_pins.h"

// The MQTT topics that this device should publish/subscribe
#define AWS_IOT_PUBLISH_TOPIC   "esp32cam/pub"
#define AWS_IOT_SUBSCRIBE_TOPIC "esp32cam/sub"

//Connect to API Gateway
//WiFiClientSecure net = WiFiClientSecure();
//  WiFiClient net;
  WiFiClientSecure client;
  //HTTPClient http;
  //net.setTimeout(5000); // Set timeout to 5 seconds

void connectAWS()
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  //Connecting to Wi-Fi....

  while (WiFi.status() != WL_CONNECTED){
    delay(500);
  }

  // Configure WiFiClientSecure to use the AWS credentials
  client.setCACert(AWS_CERT_CA);
  //net.setCertificate(AWS_CERT_CRT);
  //net.setPrivateKey(AWS_CERT_PRIVATE);
}


void initCam() {

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  //init with high specs to pre-allocate larger buffers
  if(psramFound()){
    //config.frame_size = FRAMESIZE_QVGA;
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality =10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  #if defined(CAMERA_MODEL_ESP_EYE)
    pinMode(13, INPUT_PULLUP);
    pinMode(14, INPUT_PULLUP);
  #endif

  // camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    //Camera init failed with error
    return;
  }

  sensor_t * s = esp_camera_sensor_get();
  //initial sensors are flipped vertically and colors are a bit saturated
  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);//flip it back
    s->set_brightness(s, 1);//up the blightness just a bit
    s->set_saturation(s, -2);//lower the saturation
  }
  //drop down frame size for higher initial frame rate
  //s->set_framesize(s, FRAMESIZE_QVGA);

  #if defined(CAMERA_MODEL_M5STACK_WIDE)
    s->set_vflip(s, 1);
    s->set_hmirror(s, 1);
  #endif
  
}

void takePictureAndSubmit() {

    // capture camera frame
  camera_fb_t *fb = esp_camera_fb_get();
  if(!fb) {
     //Camera capture failed
      return;
  } else {
      //Camera capture successful
  }

  //-begin the submission process
/* -
****************************************************************    
**                  HTTP request format                       **
****************************************************************    
**  PUT /dev/logoimagetest/rets.jpeg HTTP/1.1                 **
**  Host: ji9i1wzlva.execute-api.us-east-1.amazonaws.com      **
**  Content-Type: image/jpeg                                  **
**  Content-Length: 22                                        **
**                                                            **
**  "<file contents here>"                                    **
****************************************************************    
****************************************************************    
*/
    WiFiUDP ntpUDP;
   NTPClient timeClient(ntpUDP);
   timeClient.begin();
   timeClient.update();
   String Time =  String(timeClient.getEpochTime());
   
String s3Url = String(s3Path);
s3Url.replace("{filename}", Time);

  if (!client.connect(s3Endpoint, 443))
    {
      //Failed connection
    }
  else {   
   // Connected to the API endpoint
       // Set the headers
  String headers =
    "Content-Type: image/jpeg\r\n" +
    String("Content-Length: ") + String(fb->len) + "\r\n";

    //Flash LED to indicate successful connection to the server
    digitalWrite(LED_BUILTIN,HIGH);
    delay(500);
    digitalWrite(LED_BUILTIN,LOW);
    delay(500);
    //Send command to the Arduino to signify successful data transmission to AWS
    Serial.write('A'); 

    //Make HTTP request:
    client.println("PUT " + String(s3Url) + " HTTP/1.1");
    client.println("Host: " + String(s3Endpoint));
    client.println(headers);
    client.write(fb->buf, fb->len);
    //client.println("Connection: close");
    //client.println();
    
  // Read and print the server's response
  while (client.connected()) {
    String line = client.readStringUntil('\n');
     if (line == "\r") {
        break;
    }
  }

  // if there are incoming bytes available
    // from the server, read them and print them:
    while (client.available()) {
      char c = client.read();
      /* The bytes could be stored in a buffer */
    }
  // Disconnect from the API endpoint
  client.stop();
  }
    // Clean up the camera resources
    esp_camera_fb_return(fb);
    esp_camera_deinit();
}

void setup() {
  pinMode(LED_BUILTIN,OUTPUT);
  Serial.begin(115200);
  initCam();
  connectAWS();
}

void loop() {
  if(Serial.available() > 0)
  {
    char rx = Serial.read();
    if(rx == 'T')
    {
      //'T' is the command to take a picture (received from the Arduino)
      takePictureAndSubmit();
    }
  }
}
