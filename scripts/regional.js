regional.js

const fs = require("fs");
const express = require("express");
const { chromium } = require("playwright");

const app = express();

const PORT = process.env.PORT || 3000;

const CATEGORY = "regional";

const OUTPUT = "jimin-regional.json";

async function test() {

  const browser =
    await chromium.launch({

      headless: true,

      args: [

        "--no-sandbox",

        "--disable-setuid-sandbox",

        "--disable-dev-shm-usage"

      ]

    });

  const context =
    await browser.newContext({

      storageState: "auth.json"

    });

  const page =
    await context.newPage();

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

  const jiminResults = [];

  for (const country of countries) {

    for (const type of chartTypes) {

      const url =

        `https://charts.spotify.com/charts/view/${CATEGORY}-${country}-${type}/latest`;

      console.log(
        "OPENING:",
        url
      );

      try {

        await page.goto(

          url,

          {

            waitUntil: "networkidle",

            timeout: 60000

          }

        );

        await page.waitForSelector(

          "tbody tr",

          {

            timeout: 15000

          }

        );

        const results =
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

              const spotifyLink =
                row.querySelector(
                  "a[href*='open.spotify.com']"
                )
                ?.href || "";

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

        for (const item of results) {

          const text = `

            ${item.song}

            ${item.artists}

          `.toLowerCase();

          if (

            text.includes("jimin")

          ) {

            jiminResults.push({

              category: CATEGORY,

              country,

              chartType: type,

              chartUrl: url,

              updatedAt:
                new Date().toISOString(),

              ...item

            });

          }

        }

      }

      catch (err) {

        console.log(
          "SKIPPED:",
          url
        );

        console.log(
          err.message
        );

      }

    }

  }

  fs.writeFileSync(

    OUTPUT,

    JSON.stringify(
      jiminResults,
      null,
      2
    )

  );

  await browser.close();

  return jiminResults;

}

app.get("/", (req, res) => {

  try {

    if (

      !fs.existsSync(OUTPUT)

    ) {

      return res.json({

        status: "waiting",

        message: "No data yet"

      });

    }

    const data =
      fs.readFileSync(
        OUTPUT,
        "utf8"
      );

    res.setHeader(
      "Content-Type",
      "application/json"
    );

    res.send(data);

  }

  catch (err) {

    res.status(500).json({

      error: err.message

    });

  }

});

app.get("/update", async (req, res) => {

  try {

    const data =
      await test();

    res.json({

      success: true,

      total: data.length

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      error: err.message

    });

  }

});

app.listen(PORT, async () => {

  console.log(
    "SERVER RUNNING"
  );

  try {

    await test();

  }

  catch (err) {

    console.log(err);

  }

});
