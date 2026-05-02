const fs = require("fs");


const { chromium } = require("playwright");



/*
  LOAD OLD DATE
*/

function getSavedDate() {

  try {

    return fs.readFileSync(
      "last_date.txt",
      "utf8"
    );

  }

  catch {

    return "";

  }

}



/*
  SAVE DATE
*/

function saveDate(date) {

  fs.writeFileSync(
    "last_date.txt",
    date
  );

}






async function test() {


  /*
    FAST BROWSER
  */


  const browser =
    await chromium.launch({


      headless: true


    });






  const context =
    await browser.newContext({


      storageState: "auth.json"


    });






  const page =
    await context.newPage();



  /*
    CHECK CURRENT DATE
  */

  await page.goto(

    "https://charts.spotify.com/charts/view/regional-global-daily/latest",

    {

      waitUntil: "domcontentloaded",

      timeout: 15000

    }

  );



  await page.waitForSelector(

    "#date_picker",

    {

      timeout: 10000

    }

  );



  const currentDate =

    await page.locator(
      "#date_picker"
    ).inputValue();



  console.log(
    "CURRENT DATE:",
    currentDate
  );



  /*
    GET OLD DATE
  */

  const oldDate =
    getSavedDate();



  console.log(
    "OLD DATE:",
    oldDate
  );



  /*
    FIRST RUN
  */

  if (!oldDate) {

    console.log(
      "FIRST RUN DETECTED"
    );

  }



  /*
    STOP IF NO UPDATE
  */

  else if (

    currentDate === oldDate

  ) {

    console.log(
      "NO CHART UPDATE"
    );



    await browser.close();



    return;

  }



  /*
    BACKUP OLD JSON
  */

  if (

    fs.existsSync("jimin.json")

  ) {

    if (

      !fs.existsSync("history")

    ) {

      fs.mkdirSync(
        "history"
      );

    }



    const backupName =

      oldDate
      .replace(/\s+/g, "-")
      .replace(/,/g, "");



    fs.copyFileSync(

      "jimin.json",

      `history/${backupName}.json`

    );



    console.log(
      "OLD JSON BACKED UP"
    );

  }






  /*
    ALL CHART CATEGORIES
  */


  const categories = [


    "regional",
    "artist",
    "album",
    "viral"


  ];






  /*
    ALL COUNTRIES
  */


  const countries = [


    "global",


    "ad",
    "ae",
    "ar",
    "at",
    "au",
    "be",
    "bg",
    "bo",
    "br",
    "ca",
    "ch",
    "cl",
    "co",
    "cr",
    "cy",
    "cz",
    "de",
    "dk",
    "do",
    "ec",
    "ee",
    "eg",
    "es",
    "fi",
    "fr",
    "gb",
    "gr",
    "gt",
    "hk",
    "hn",
    "hu",
    "id",
    "ie",
    "il",
    "in",
    "is",
    "it",
    "jp",
    "kr",
    "lt",
    "lu",
    "lv",
    "ma",
    "mt",
    "mx",
    "my",
    "ni",
    "nl",
    "no",
    "nz",
    "pa",
    "pe",
    "ph",
    "pl",
    "pt",
    "py",
    "ro",
    "sa",
    "se",
    "sg",
    "sk",
    "sv",
    "th",
    "tr",
    "tw",
    "ua",
    "us",
    "uy",
    "vn",
    "za"


  ];






  /*
    DAILY + WEEKLY
  */


  const chartTypes = [


    "daily",
    "weekly"


  ];






  const jiminResults = [];






  /*
    LOOP EVERYTHING
  */


  for (const category of categories) {


    for (const country of countries) {


      for (const type of chartTypes) {


        const url =


          `https://charts.spotify.com/charts/view/${category}-${country}-${type}/latest`;






        console.log(
          "OPENING:",
          url
        );






        try {


          /*
            OPEN PAGE
          */


          await page.goto(


            url,


            {


              waitUntil: "domcontentloaded",


              timeout: 15000


            }


          );






          /*
            WAIT TABLE
          */


          await page.waitForSelector(


            "tbody tr",


            {


              timeout: 5000


            }


          );






          /*
            SCRAPE ROWS
          */


          const results =
            await page.locator("tbody tr")
            .evaluateAll(rows => {


              return rows.map(row => {


                const tds =
                  row.querySelectorAll("td");






                /*
                  RANK
                */


                const rank =
                  tds[1]
                  ?.innerText
                  ?.trim()
                  ?.split("\n")[0] || "";






                /*
                  TITLE
                */


                const song =
                  row.querySelector(
                    "span[class*='StyledTruncatedTitle']"
                  )
                  ?.innerText
                  ?.trim() || "";






                /*
                  ARTISTS
                */


                const artists =
                  [
                    ...row.querySelectorAll(
                      "a[class*='StyledHyperlink']"
                    )
                  ]


                  .map(a =>
                    a.innerText.trim()
                  )


                  .join(", ");






                /*
                  STREAMS
                */


                const streams =
                  tds[6]
                  ?.innerText
                  ?.trim() || "";






                /*
                  SPOTIFY LINK
                */


                const spotifyLink =
                  row.querySelector(
                    "a[href*='open.spotify.com']"
                  )
                  ?.href || "";






                /*
                  IMAGE
                */


                const image =
                  row.querySelector("img")
                  ?.src || "";






                return {


                  rank,


                  song,


                  artists,


                  streams,


                  spotifyLink,


                  image


                };


              });


            });






          /*
            FIND JIMIN
          */


          for (const item of results) {


            const text = `


              ${item.song}


              ${item.artists}


            `.toLowerCase();






            if (


              text.includes("jimin")


            ) {


              const result = {


                category,


                country,


                chartType: type,


                chartUrl: url,


                updatedDate:
                  currentDate,


                ...item


              };






              jiminResults.push(
                result
              );






              console.log(
                "FOUND JIMIN:",
                result
              );


            }


          }






        } catch (err) {


          console.log(
            "SKIPPED:",
            url
          );


        }


      }


    }


  }






  /*
    SAVE RESULTS
  */


  fs.writeFileSync(


    "jimin.json",


    JSON.stringify(
      jiminResults,
      null,
      2
    )


  );



  /*
    SAVE NEW DATE
  */

  saveDate(
    currentDate
  );






  console.log(
    "TOTAL JIMIN FOUND:",
    jiminResults.length
  );






  console.log(
    "jimin.json saved"
  );






  await browser.close();


}






test();
