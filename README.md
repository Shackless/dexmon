# Dexmon

This script uses the inofficial and undocumented Share API of Dexcom.
Dexcom also offers an official and more secure developer API but this is currently only available in the US and well.. I'm living in Europe.

You first need to enabe the 'Share' functionality of your Dexcom glucose reading system:

- Open the Dexcom app on your smartphone.
- Click the 'Share' button on top and follow the instructions in the app.
- Invite any follower. You can use a fake email/account and the follower does NOT have to accept the invitation at all.
- Make sure that the 'Sharing' toggle is enabled and the 'Sharing status' shows a green line from your smartphone to the cloud/internet.
- Setup the config values below.

 I was only able to test this script with my Dexcom G6 that measures every 5 minutes, so I also setup my XBar script to refresh every 5 minutes.
 This script should also work with other Dexcom systems if they have the 'Share' functionality but you might have to adapt the refresh interval.

 This script displays the trend arrow, latest glucose reading and when that reading was taken (not when the the script was executed last time).



## CONFIG - Adjust to your needs!



```js
// The credentials of YOUR Dexcom account (not the one you are sharing with):
const dexcomUserName = "XXX";
const dexcomPassword = "YYY";

// Dexcom has separate databases and API endpoints for US and rest-of-the-world customers.
// Set to true if you are living outside of the United States of America (e.g. in Europe):
const livingOutsideUs = true;

// Glucose readings outside of these threshold values will be printed in red:
const lowGlucoseThreshold = 65;
const highGlucoseThreshold = 200;
// Glucose readings within threshold +- this deviation value will be printed in yellow.
const thresholdDeviation = 5;
```
