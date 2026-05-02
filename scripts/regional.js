const fs = require("fs");
const express = require("express");
const { chromium } = require("playwright");

const app = express();

const OUTPUT_FILE = "jimin-regional.json";



async function scrapeCharts() {

  const browser = await chromium.launch({

    headless: true,

    args: [

      "--no-sandbox",

      "--disable-setuid-sandbox",

      "--disable-dev-shm-usage"

    ]

  });

  const context = await browser.newContext({

    storageState: "auth.json"

  });

  const page = await context.newPage();



  const countries = [

    "global",

    "ad","ae","ar","at","au","be","bg","bo","br",
    "ca","ch","cl","co","cr","cy","cz",
    "de","dk","do",
    "ec","ee","eg","es",
    "fi","fr",
    "gb","gr","gt",
    "hk","hn","hu",
    "id","ie","il","in","is","it",
    "jp","kr",
    "lt","lu","lv",
    "ma","mt","mx","my",
    "ni","nl","no","nz",
    "pa","pe","ph","pl","pt","py",
    "ro",
    "sa","se","sg","sk","sv",
    "th","tr","tw",
    "ua","us","uy",
    "vn","za"

  ];



  const chartTypes = [

    "daily",
    "weekly"

  ];



  const results = [];



  for (const country of countries) {

    for (const type of chartTypes) {

      const url =

        `https://charts.spotify.com/charts/view/regional-${country}-${type}/latest`;



      console.log("OPENING:", url);



      try {

        await page.goto(url, {

          waitUntil: "networkidle",

          timeout: 60000

        });



        await page.waitForSelector(

          "tbody tr",

          {

            timeout: 20000

          }

        );



        const rows =

          await page.locator("tbody tr")
          .evaluateAll(rows => {

            return rows.map(row => {

              const tds =
                row.querySelectorAll("td");



              const rank =
                tds[1]
                ?.innerText
                ?.trim()
                ?.split("\n")[0] || "";



              const song =
                row.querySelector(
                  "span[class*='StyledTruncatedTitle']"
                )
                ?.innerText
                ?.trim() || "";



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



              const streams =
                tds[6]
                ?.innerText
                ?.trim() || "";



              return {

                rank,

                song,

                artists,

                streams

              };

            });

          });



        for (const item of rows) {

          const text = `

            ${item.song}

            ${item.artists}

          `.toLowerCase();



          if (

            text.includes("jimin")

          ) {

            results.push({

              country,

              chartType: type,

              ...item

            });



            console.log(

              "FOUND JIMIN",

              item.song

            );

          }

        }

      }

      catch (err) {

        console.log(

          "FAILED:",

          url

        );

      }

    }

  }



  fs.writeFileSync(

    OUTPUT_FILE,

    JSON.stringify(
      results,
      null,
      2
    )

  );



  await browser.close();



  console.log(

    "REGIONAL SAVED"

  );

}



/*
  SHOW JSON
*/

app.get("/", (req, res) => {

  try {

    if (

      !fs.existsSync(
        OUTPUT_FILE
      )

    ) {

      return res.json([]);

    }



    const data =

      fs.readFileSync(
        OUTPUT_FILE,
        "utf8"
      );



    res.setHeader(

      "Content-Type",

      "application/json"

    );



    res.send(data);

  }

  catch {

    res.json([]);

  }

});



/*
  MANUAL UPDATE
*/

app.get("/update", async (req, res) => {

  try {

    await scrapeCharts();



    res.json({

      success: true

    });

  }

  catch (err) {

    console.log(err);



    res.json({

      success: false

    });

  }

});



/*
  START SERVER
*/

app.listen(3000, async () => {

  console.log(

    "SERVER RUNNING"

  );



  try {

    await scrapeCharts();

  }

  catch (err) {

    console.log(err);

  }

});
