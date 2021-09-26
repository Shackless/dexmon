#!/usr/bin/env /Users/shackles/.nvm/versions/node/v14.16.0/bin/node

//  <xbar.title>dexmon</xbar.title>
//  <xbar.version>v1.0</xbar.version>
//  <xbar.author>Simon Hopstätter</xbar.author>
//  <xbar.author.github>Shackless</xbar.author.github>
//  <xbar.desc>Display readings from your Dexcom glucose sensor utilizing its 'Share' feature. Please read and follow the setup instructions in the code!</xbar.desc>
//  <xbar.image>https://shipbit.de/shipbit-images/logo.png</xbar.image>
//  <xbar.dependencies>node,npm,npm/dexcom-share,npm/javascript-time-ago</xbar.dependencies>
//  <xbar.abouturl>http://url-to-about.com/</xbar.abouturl>

const qs = require("querystring");
const fetch = require("node-fetch");
const TimeAgo = require("javascript-time-ago");
const en = require("javascript-time-ago/locale/en");

//================================================================================================================================================//
//==== README - SETUP ============================================================================================================================//
//
// This script uses the inofficial and undocumented Share API of Dexcom.
// Dexcom also offers an official and more secure developer API but this is currently only available in the US and well.. I'm living in Europe.
//
// You first need to enabe the 'Share' functionality of your Dexcom glucose reading system:
//    1. Open the Dexcom app on your smartphone.
//    2. Click the 'Share' button on top and follow the instructions in the app.
//    3. Invite any follower. You can use a fake email/account and the follower does NOT have to accept the invitation at all.
//    4. Make sure that the 'Sharing' toggle is enabled and the 'Sharing status' shows a green line from your smartphone to the cloud/internet.
//    5. Setup the config values below.
//
// I was only able to test this script with my Dexcom G6 that measures every 5 minutes, so I also setup my XBar script to refresh every 5 minutes.
// This script should also work with other Dexcom systems if they have the 'Share' functionality but you might have to adapt the refresh interval.
//
// This script displays the trend arrow, latest glucose reading and when that reading was taken (not when the the script was executed last time).
//

//================================================================================================================================================//
//==== CONFIG - Adjust to your needs! ============================================================================================================//

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

//=====  END CONFIG ==============================================================================================================================//
//================================================================================================================================================//

const constants = {
  urls: {
    base: "https://share2.dexcom.com/ShareWebServices/Services",
    baseOutsideUs: "https://shareous1.dexcom.com/ShareWebServices/Services",
    login: "/General/LoginPublisherAccountByName",
    latestGlucose: "/Publisher/ReadPublisherLatestGlucoseValues",
  },
  applicationId: "d89443d2-327c-4a6f-89e5-496bbb0317db",
  "content-type": "application/json",
  header: {
    "User-Agent": "Dexcom Share/3.0.2.11 CFNetwork/711.2.23 Darwin/14.0.0",
    Accept: "application/json",
  },
};

let sessionId;

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

function getBaseUrl() {
  return livingOutsideUs ? constants.urls.baseOutsideUs : constants.urls.base;
}

async function requestLogin() {
  const res = await fetch(`${getBaseUrl()}${constants.urls.login}`, {
    method: "POST",
    headers: {
      ...constants.header,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password: dexcomPassword,
      applicationId: constants.applicationId,
      accountName: dexcomUserName,
    }),
  });

  if (!res.ok) {
    throw new AuthorizeError(body.Message);
  }

  return await res.json();
}

async function requestLatestReadings(minutes = 1440, maxCount = 1) {
  if (!sessionId) {
    sessionId = await requestLogin();
  }

  const q = {
    sessionID: sessionId,
    minutes,
    maxCount,
  };

  const res = await fetch(
    `${getBaseUrl()}${constants.urls.latestGlucose}?${qs.stringify(q)}`,
    {
      method: "POST",
      headers: constants.header,
    }
  );

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`);
  }

  const readings = await res.json();

  for (const reading of readings) {
    reading.Date = parseDate(reading.WT);
  }

  return readings.sort((a, b) => a.Date - b.Date);
}

function getIcon(trend) {
  switch (trend) {
    case 1: // DoubleUp
    case 2: // SingleUp
      return "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB9ElEQVRYR8WXvzIEQRDGf/s8PAS5kCoJCREREdG5iIiIiIREIJTzEDzPqd6a2Zqb7e7pXapscrWz3V9/8/Wfmes6xs8KkHX5bT3ZP9tmv3pdcGpMee+igVpEtO8tEj2B2jFCKNlcATvJ/x2Qd/XxMLUMROSXYItK1qVHwlJIJZCNtZxJkFUKroC6JDQl1BqwJOuc4IXPiMTkFBipHGQPFKSphKFqE1LybRaZRbiDpdfKahco/doHV/PXnhVCWtQwH7cIU6VrO98HXitUbU1MXBIegZHsSYVD4EXZvHw+AJ6V7fYkLBU1eaycHwNPyaFOb97MEfBokdAGX79WsLOq/RR4KAAsAoJ1soJ7a06USmhz4AvYqJzPgbtqbY1Al8Z6sXgG3FayfwObJY5WAx/AVmF0Cdwo09FUoPC9AK6L909gWyVQpWA3Gb05/e8SKPAWHewl4xHeoEDrFFS+qwRaOGYRNmfh2CCSgiaseSHJO3F25HVB6DaVu6/J0jD4OwLaCRW4D/5NCuZsPxEOdUGrKFuHkcevJ1AEmIU1y6lxFoREHYo8MwjkfACOpCDEIl/LW3mqpM7Yk4rQivFvKSjPFletOYMoKv/aIIqkoQIuT821U24K1m9SIBeXyKlp/tOS4CMCU9hPlVrrNFWBKAnPzmvv8tsPvhOFJq54RKYAAAAASUVORK5CYII=";
    case 3: // FortyFiveUp
      return "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACOElEQVRYR62WW2oVQRCGv16MTy5C3UNIFI3ESFQULySYiJJEFMULihcUNUTFJJiAO/DBvGUDPrqXkR6mD911qqu7h8zLOdNTXfVX/X9Vt+MYHwd0ir94Xdr496on5zxsrgmuBaoGEG8uganKaDBKAIx1PGZf2NMD0HjRuBxAPwROAacbMz0CNoHfse8xFPwFTo7JGvgHnJCibEnE2/6pyd4AmFR9UoHwxyh9AOopmPFVsJAbrefiWFkKLF0Uyj8LHBjgkqSrNNDA91ngZ2E2THVeqwYm9gLYeWA3N2wiansKwnvyorVkJbp54IdiOxfTMQRur0BOoIPDBeCbEvwcsO+gE8JOATTwO1V6B4sdbCvBLwB7w7psrJSC0mFiULAEfFG+XwR2ovUpAPJcSXzkKiLWrwKfFNtLwHex3gOI1sZpIErjOvBByfwy8FURclsFrE5wcLODd8qQutLBVoYuWwMlEUbfbwNvFM1cAz4bfuKz4xA4o2qgAGQZeKXY3AA+FmZFODu82S/AvycdVZo1d4EXitEt4H2pi7TEwpr/Nc8CB2sdPFOC3wHexsH9/8l4VS6n1jDLVeC+gyeKhFc6eF3K3BJzDQXrwCMF2SrwUq5bR3cJqEaBF4m/u8kBda+D5yXBhMyDna9gTgfSNuzR7nwPgKe54FYH1bS59CvvfBvA45rMxwKU+8y+PQ4gyYWkxaFspRrxlfz3Pks8xTY1tlZQLYkSyOrvsrQVV/z8JIz7s8ZRNUph+B+Na5Ek1BPc9gAAAABJRU5ErkJggg==";
    case 4: // Flat
      return "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB6klEQVRYR62XIXrDMAyF/5ynY7tADzEwNjg2VFTSBhQNjQ2O7QLlvcBo71KWfe7sfKojWUrWsNSx9PT89OR2LHg6YHD2ad9Yvy2A4G+5K4AULD1e1RLWXQHU9dbBo8lSHG2vyWfkrIE98NTBZYBjercAar8Xdv1DFV9UgU7AWiz3GVQoZgiAw8QP8Fhl6zvYS81YOhoBBOmenCGwq5NlME0mSr4QA5Z4RIXbDg5Kl7ggJgBaTDhrmwHeFbBJpAmI+ixmwIj3Bnwoa6kz+sKQ1IMLQJ5VCiA3GMb0CnxqIDQmXABeLxnH8gJ8RUDcAIg4nCbI2oKzbT8D3x4ICeDqaMBqYdXeNrk+docEcOpgHRk4Vjd4XiLWz8BDYbMgqy11UpHlZt6xKMPsPCgAylBZRViYw3dLB6EuaFGeBafhsUR4444hACV67QkNFsY2rMBPkl8BzBDPTU5jn2VE6lyYxUDNhPI+WrFXeW3LkcrUb0SiDXkYVcaUZkAS+PjIo3QZCLrjFjgomnBvRyoArd8bOknV7ZYkH41oqbPlpO6VrCXyrkWx1x0ZQOhS6nmJ2dKe/aYb8PA3xC7A0bgfXuPLWFKIrqtq6IPshGKP6P4zAyymmudf3bBme4FbntH72v+FCQseco+tlnYk8F+7xpQmAJKjtQAAAABJRU5ErkJggg==";
    case 5: // FortyFiveDown
      return "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACUUlEQVRYR72WzU4VQRCFv34e2eED8BAGIhKNhp9oQIMS0Sg/AYxoBIIajUogENC4dw/sZclT8ALshvTQc+mpqe6pUePd3Z7TVadOna5ux3/+OaCIcrrGggDk+Mm9GrYNUyOggf2a/8Ws/5VoPnYVv1PMlGpt1aYUKllEFS4CN4BzB7+ARVl9SqkK16WtpQJiwyEwELGdB5Y7SWQAVzkbLXDwu4B+EeOlg1d/6oM4mVSppkAA+hYsKDI/d7CqBdCIWf2QMuEcsKS0ZxZ4q6wbRL+CxORyp+AFsKLINwOsyYxdKq4Nohbqz4DXCuYxsKG5vcJa/WKZA0+BN0qFj4D3XSdljnQu1hPgnQKYAj7G67Jl7nKO+LlyBhz7uSLxvf8tfZx2sK5I+wD4rB21EDieK6dAn0rAaKKHwKaixATwNWHMknNE0HUxodaWSeCD8mEM2JJH1EEhVKv5zmJCOap9jvsOPvnAQrl7wI4gp10lJcTvNRFIuHMc+KK07g6wF+0pBKbxBDBNsYTJRoFvSu9HCjgI60kFShVSF4X/aBwmd4Ft5SgOAz+UMHkPGE+DLPo2sKtIOQT8rNZDbJsJK1TqkSHdDtwC9g39bNzAhj2XEIM6N4HvouKe00MxdgKphC1EBmPZFYP+9SCq3ozXFONl1Yw9EJvf3IIAPHQwkPOGFjBSTTehJmtCavlo7eXTrlpxlE+A6zFOnYQSIKrt3IIQz9+E/h45ig3dIGBwunR1awtzMXsE2kBdXr6GVtTalqzAooZxPmRzJE3Uqm0AWIlq8S4A9OunI0491BEAAAAASUVORK5CYII=";
    case 6: // SingleDown
    case 7: // DoubleDown
      return "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACI0lEQVRYR8WXMVZWMRCFvyzAlWCnPRugtaDSTitopNFCKKTBRivpoKKhYwX22MFKXEA8+UnemUwmyYRzPL7uTTIzN3duZt4L/Ocn6PzJEAegZuvPiTfloJP0FNjPzr+A9D58rDg7BvSCfB+c+AHYy/6PEV6W7IXWEZN67wz8ti4A6fjhOeWpNLAYIKr9FQAZOCHtxW5E6KYia1UE7jJQ9lildgMwdNGUwAtex/L6aRorAAGCR3TWNa1sCzpYYuCfaUCgN8s5O1BXAyPhpKSxbZhmT5nV1y1CI9CwBL2uZzr1OteEPlOEVhcdgZmWoNeqUxXUabZYI+BWL5iVqbe+dAt6QSwGypR7AdwBZ50R6wWQ4h0Af4BmajYAAjzEPOVy4s/AeU+E4rbsGpGi+BPwVZTxETE1i13HvgdeKeMJ8E0Fb4aR9AnwMcKFsv2O8FrZmrMlyr4YJz4GfggQIwBHAb4brTmVs/pwqUogrmMFQiT9AFxmcD0NvAd+GgdokvdKUHx7TLwDro1Px4TzLXDlTb4B6DWiTNdWDiG4wwg3JVG2HyJsAsRZULRL6qr+bTWJ+ORsacIzRbu0FxDeWdCAmE253D82wVkteqYBXcoNxGpyVaqGuZ3B2b89IHa0O0BueVdnQQpeaUJ0QLPmVitPtuLnBiBuwWlUIMLTzEj2pceaBd1/Q0VrYuFNznbr+TWzkLlugVMfSyeXwlx29AjMsycl/gt7HJ4j7JEBbgAAAABJRU5ErkJggg==";
    case 8: // NotComputable
    case 9: // OutOfRange
      return "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADqklEQVRYR62XS0hWQRTHf7MNLEJbFEQP0nBTCAZBFgXVsih7EdS+9z5davuyx75FaGVQywqKSgiKojZRSaZCLSpExbYT53rmeu44935XaDbfd+fxP/8573HUGA7w0ATsBY4DbQ5aPDTr8T/Ab+ALMAQ8BWbLoAUvDKfg2bf9b77bgQvACWBlDb6yZcrBoIcB4FPVmQKBxMY+Fb48XovJlgiZcTDgodeuFy6durVs9vAC2Blp5q2Dxx6eAD+Anwq8GlgD7HOw30NnROglsCvWdsBesMe8YBm/gBYDIgBXgWFLqEIL3cClcAHFER9ZFewvcuS/9YcgbwxYb4T3AFdyp1GSQXgDU1wG+g3Wd2CDxYoJ3AWOGpZdDkZUK7GZC9MOXGqfgx0eXpnD94BjlkT4Lw4nt82Gg1YPoxU3jOWltBngNjn4ag70O+gNZpBNEmqvgeUq8CLzIbQoNM1cQwIReQnla8poBtguIRpY3wTO6GLmsbG+E985ARVUqgFj0jyygFvAWVlbAYzrr8g5ErzdCk2Eqw8q1N8yHwiRJXASHfcVdxpYJ7ingNs6+RHYWnb7iMRSTRBgPwBb9OO0YAqjbgW/4eC8vVmFKSoJ2HiPMK4D53RuWPa9Azp0Yg/wvMz5IpPUMkHiAruBZyrjvdSCCQ9rdeNmqWg183xtJ4xItAGflcCkEJjzsEw3SRjOliSeHEcJJk1QRV7XpKxLGMr4K3NzGAK2jlfYUQ57G3c+ndYzKRGpRQQmiEywlCgw4FWZ0ELmJgAmMyd00KH6zJ2wRiKqypKpmwfI3AmB90JgUNospS9Vr6eRD9QhVxFJUh2lSsoYErmHgAc68RbYVmWCzPgNGDSIojcOOhXjsOxtcjDuF/q9PBXXDMdKOhbDQbdfSMVTIRULQK1i9B9ScaEYOSlGCtru4LWH0HwWuqDUFR1kmTCMsobE+ELeHTmY8VE5ln19ThsSrQVdwEjK5lWJyBDKfSXRFYkjZp1yHLtWRbLeCoyWGDlLRKZwleWBTcBXg1HoNwqHFDDuiPPuqCK0yuLedkGyJ+uM7YWSDxMHY77YGRfa8pSaIy2l2vKsI460VjRB5OVZh1xgCx89CBnpIVIPEwlhecyEhiMIuOdNJxxhzn+WFJ7saeY0OholoNhX1Nuluc2fZnFuyeSmJoMwB+1+/nF60vSNSb806p32cEc76/xxmkpspRUsymDi7dK8HgAOAhvl6eagWYmG5/k3Bw89PAKmrVbLsuo/BqcRny3nzvgAAAAASUVORK5CYII=";
    default:
      return null;
  }
}

function getColor(glucose) {
  if (glucose <= lowGlucoseThreshold || glucose >= highGlucoseThreshold) {
    return "red";
  } else if (
    glucose <= lowGlucoseThreshold + thresholdDeviation ||
    glucose >= highGlucoseThreshold - thresholdDeviation
  ) {
    return "yellow";
  }
  return null;
}

requestLatestReadings()
  .then((readings) => {
    if (!readings?.length) {
      console.log("NO READINGS");
      return;
    }

    const latestReading = readings[readings.length - 1];
    const date = new Date(latestReading.Date);
    const glucose = latestReading.Value;
    const trend = latestReading.Trend;

    const image = getIcon(trend);
    const color = getColor(glucose);
    const formattedTimeAgo = timeAgo.format(date, "mini-minute-now");

    let result = `${glucose} mg/dL (${formattedTimeAgo})`;
    if (!!image) {
      result += ` | templateImage=${image}`;
    }
    if (!!color) {
      result += ` | color=${color}`;
    }

    console.log(result);
  })
  .catch((e) => {
    console.log(e);
  });
