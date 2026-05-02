
const fs = require("fs");
const express = require("express");
const { chromium } = require("playwright");

const app = express();

function getSavedDate() {
  try {
    return fs.readFileSync("last_date.txt", "utf8");
  } catch {
    return "";
  }
}

function saveDate(date) {
  fs.writeFileSync("last_date.txt", date);
}

async function test() {

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

  await page.goto(
    "https://charts.spotify.com/charts/view/regional-global-daily/latest",
    {
      waitUntil: "domcontentloaded",
      timeout: 15000
    }
  );

  await page.waitForSelector("#date_picker", {
    timeout: 10000
  });

  const currentDate = await page.locator("#date_picker").inputValue();

  console.log("CURRENT DATE:", currentDate);

  const oldDate = getSavedDate();

  console.log("OLD DATE:", oldDate);

  if (!oldDate) {
    console.log("FIRST RUN DETECTED");
  }
  else if (currentDate === oldDate) {
    console.log("NO CHART UPDATE");
    await browser.close();
    return;
  }

  if (fs.existsSync("jimin-album.json")) {

    if (!fs.existsSync("history")) {
      fs.mkdirSync("history");
    }

    const backupName =
      oldDate.replace(/\s+/g, "-").replace(/,/g, "");

    fs.copyFileSync(
      "jimin-album.json",
      `history/${backupName}-album.json`
    );

    console.log("OLD JSON BACKED UP");
  }

  const categories = [
    "album"
  ];

  const countries = [
    "global",
    "ad","ae","ar","at","au","be","bg","bo","br","ca","ch","cl","co","cr","cy","cz",
    "de","dk","do","ec","ee","eg","es","fi","fr","gb","gr","gt","hk","hn","hu",
    "id","ie","il","in","is","it","jp","kr","lt","lu","lv","ma","mt","mx","my",
    "ni","nl","no","nz","pa","pe","ph","pl","pt","py","ro","sa","se","sg","sk",
    "sv","th","tr","tw","ua","us","uy","vn","za"
  ];

  const chartTypes = [
    "daily",
    "weekly"
  ];

  const jiminResults = [];

  for (const category of categories) {
    for (const country of countries) {
      for (const type of chartTypes) {

        const url =
          `https://charts.spotify.com/charts/view/${category}-${country}-${type}/latest`;

        console.log("OPENING:", url);

        try {

          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 15000
          });

          await page.waitForSelector("tbody tr", {
            timeout: 5000
          });

          const results =
            await page.locator("tbody tr")
            .evaluateAll(rows => {

              return rows.map(row => {

                const tds = row.querySelectorAll("td");

                const rank =
                  tds[1]?.innerText?.trim()?.split("\\n")[0] || "";

                const song =
                  row.querySelector(
                    "span[class*='StyledTruncatedTitle']"
                  )?.innerText?.trim() || "";

                const artists =
                  [...row.querySelectorAll(
                    "a[class*='StyledHyperlink']"
                  )]
                  .map(a => a.innerText.trim())
                  .join(", ");

                const streams =
                  tds[6]?.innerText?.trim() || "";

                const spotifyLink =
                  row.querySelector(
                    "a[href*='open.spotify.com']"
                  )?.href || "";

                const image =
                  row.querySelector("img")?.src || "";

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

            if (text.includes("jimin")) {

              const result = {
                category,
                country,
                chartType: type,
                chartUrl: url,
                updatedDate: currentDate,
                ...item
              };

              jiminResults.push(result);

              console.log("FOUND JIMIN:", result);

            }

          }

        } catch (err) {

          console.log("SKIPPED:", url);

        }

      }
    }
  }

  fs.writeFileSync(
    "jimin-album.json",
    JSON.stringify(jiminResults, null, 2)
  );

  saveDate(currentDate);

  console.log("TOTAL JIMIN FOUND:", jiminResults.length);

  console.log("jimin-album.json saved");

  await browser.close();

}

app.get("/", async (req, res) => {
  try {
    await test();
    res.send("SCRAPER FINISHED");
  } catch (err) {
    console.log(err);
    res.status(500).send("ERROR");
  }
});

app.listen(3000, () => {
  console.log("SERVER RUNNING");
});
