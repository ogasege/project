#include <Servo.h>

//Interfacing Arduino Uno with ESP32-CAM

const int servoPos0 = 0;
const int servoPos1 = 90;
const int servoPos2 = 180;

const int servoPin = 6;
const int trigPin = 9;
const int echoPin = 10;

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
  long distance = duration * 0.034 / 2;
  Serial.print("Distance: ");
  Serial.println(distance);
  return distance;
}

void setup() 
{
  pinMode(trigPin,OUTPUT);
  pinMode(echoPin,INPUT);
  servo.attach(servoPin);
  Serial.begin(9600);
}

void loop() 
{
  GetDistance();
  servo.write(servoPos0);
  delay(1000);
  servo.write(servoPos1);
  delay(1000);
  servo.write(servoPos2);
  delay(1000);
}
