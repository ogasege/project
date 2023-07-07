#include <SoftwareSerial.h>
#include <Servo.h>

//Interfacing Arduino Uno with ESP32-CAM

enum State
{
  ST_DETECT = 0,
  ST_ACK_AWS,
  ST_OPEN,
  ST_CLOSE
};

const int detectionDist = 10; //in centimeters

const int servoPos0 = 0;
const int servoPos1 = 90;
const int servoPos2 = 180;

const int rxPin = 4;
const int txPin = 5;
const int servoPin = 6;
const int trigPin = 9;
const int echoPin = 10;

SoftwareSerial uart = SoftwareSerial(rxPin,txPin);
Servo servo;

long GetDistance(void)
{
  digitalWrite(trigPin,LOW);
  delayMicroseconds(2);
  //Sets the trigPin on HIGH state for 10 microseconds
  digitalWrite(trigPin,HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin,LOW);
  //Reads the echoPin, returns the sound wave travel time in microseconds
  long duration = pulseIn(echoPin,HIGH);
  //Calculating the distance
  long distance = lround(duration * 0.034 / 2);
  Serial.print("Distance: ");
  Serial.println(distance);
  delay(500);
  return distance;
}

void setup() 
{
  pinMode(rxPin,INPUT);
  pinMode(txPin,OUTPUT);
  pinMode(trigPin,OUTPUT);
  pinMode(echoPin,INPUT);
  uart.begin(115200);
  servo.attach(servoPin);
  servo.write(servoPos1);
  Serial.begin(9600);
}

void loop() 
{
  static State state = ST_DETECT;
  switch(state)
  {
    case ST_DETECT:
      if(GetDistance() < detectionDist)
      {
        uart.write('T'); //T: command to take picture (sent to the CAM)
        state = ST_ACK_AWS;
      }
      break;
    case ST_ACK_AWS:
      if(uart.available() > 0)
      {
        char rx = uart.read(); //A: command signifying successful data transmission to AWS
        if(rx == 'A')
        {
          Serial.println("AWS ACK");
          state = ST_OPEN;
        }
      }
      break;
    case ST_OPEN:
      servo.write(servoPos0);
      if(GetDistance() >= detectionDist)
      {
        state = ST_CLOSE;
      }
      break;
    case ST_CLOSE:
      servo.write(servoPos1);
      delay(2500);
      state = ST_DETECT;
      break;
  }
}
