const axios = require("axios");
const fs = require("fs/promises");
const path = require("path");

const COUNTRIES =
  require("./lib/countries.json");

const FILTERS = [
  "BTS",
  "Jimin"
];

const API_URL =
  "https://charts.youtube.com/youtubei/v1/browse?alt=json";

const DATA_DIR =
  "data";

const OUTPUT_FILE =
  path.join(
    DATA_DIR,
    "youtube-chart.json"
  );

const GLOBAL_CACHE =
  path.join(
    DATA_DIR,
    "global-cache.json"
  );

function getKSTTime() {
  return new Date().toLocaleString(
    "en-GB",
    {
      timeZone:
        "Asia/Seoul"
    }
  );
}

function isMatchArtist(
  artists = []
) {
  const artistText =
    artists
      .map(
        a => a.name
      )
      .join(" ")
      .toLowerCase();

  return FILTERS.some(
    filter =>
      artistText.includes(
        filter.toLowerCase()
      )
  );
}

function getChartType(
  key,
  listType
) {
  if (
    key ===
    "artists"
  ) {
    return "artist";
  }

  if (
    listType ===
    "TOP_SHORTS_BY_USAGE"
  ) {
    return "shorts";
  }

  if (
    key ===
    "videos"
  ) {
    return "video";
  }

  if (
    key ===
    "trackTypes"
  ) {
    return "track";
  }

  return "unknown";
}

function getFrequency(
  chartPeriodType
) {
  if (
    !chartPeriodType
  ) {
    return "unknown";
  }

  return chartPeriodType
    .toLowerCase();
}

async function fetchCountry(
  country
) {
  try {
    console.log(
      `🌍 ${country.name}`
    );

    const payload = {
      context: {
        client: {
          clientName:
            "WEB_MUSIC_ANALYTICS",

          clientVersion:
            "2.0",

          hl: "en-GB",

          gl:
            country.code ===
            "GLOBAL"
              ? "US"
              : country.code,

          experimentIds:
            [],

          experimentsToken:
            "",

          theme:
            "MUSIC"
        },

        capabilities:
          {},

        request: {
          internalExperimentFlags:
            []
        }
      },

      browseId:
        "FEmusic_analytics_charts_home",

      query:
        `flags=MusicCharts__enable_apac_and_shorts_charts_expansion&perspective=CHART_HOME&chart_params_country_code=${country.code}`
    };

    const response =
      await axios.post(
        API_URL,
        payload,
        {
          headers: {
            "Content-Type":
              "application/json",

            Origin:
              "https://charts.youtube.com",

            Referer:
              "https://charts.youtube.com/"
          },

          timeout:
            30000
        }
      );

const header =
  response.data
    ?.header
    ?.musicAnalyticsHeaderRenderer;

const actualCountryCode =
  header?.countryCode ||
  country.code;

const actualCountryName =
  header?.countryName ||
  country.name;

if (
  actualCountryCode !==
    country.code ||
  actualCountryName
    .toLowerCase()
    .trim() !==
  country.name
    .toLowerCase()
    .trim()
) {
  console.log(
    `⚠️ ${country.name}: fallback to ${actualCountryName} (${actualCountryCode})`
  );

  return [];
}


    
const sections =
  response.data
    ?.contents
    ?.sectionListRenderer
    ?.contents ||
  [];


    const entries =
      [];

    for (const section of sections) {
      const content =
        section
          ?.musicAnalyticsSectionRenderer
          ?.content;

      if (
        !content
      ) {
        continue;
      }

      const keys =
        Object.keys(
          content
        );

      for (const key of keys) {
        const list =
          content[
            key
          ];

        if (
          !Array.isArray(
            list
          )
        ) {
          continue;
        }

        for (const chart of list) {
          const chartType =
            getChartType(
              key,
              chart.listType
            );

          const frequency =
            getFrequency(
              chart.chartPeriodType
            );

          let items =
            [];

          if (
            chart.artistViews
          ) {
            items =
              chart.artistViews;
          } else if (
            chart.trackViews
          ) {
            items =
              chart.trackViews;
          } else if (
            chart.videoViews
          ) {
            items =
              chart.videoViews;
          }

          for (const item of items) {
            const artists =
              item.artists ||
              [];

            // ARTIST CHART
            if (
              chartType ===
              "artist"
            ) {
              const artistName =
                item.name ||
                "";

              const isMatch =
                FILTERS.some(
                  filter =>
                    artistName
                      .toLowerCase()
                      .includes(
                        filter.toLowerCase()
                      )
                );

              if (
                !isMatch
              ) {
                continue;
              }

              entries.push(
                {
                  country:
                    country.name,

                  countryCode:
                    country.code,

                  chartType,

                  frequency,

                  title:
                    null,

                  artist:
                    artistName,

                  rank:
                    item
                      ?.chartEntryMetadata
                      ?.currentPosition ||
                    null,

                  previousRank:
                    item
                      ?.chartEntryMetadata
                      ?.previousPosition ||
                    null,

                  views:
                    Number(
                      item.viewCount
                    ) || 0,

                  periodsOnChart:
                    item
                      ?.chartEntryMetadata
                      ?.periodsOnChart ||
                    0,

                  thumbnail:
                    item
                      ?.thumbnail
                      ?.thumbnails?.[
                        0
                      ]?.url ||
                    null
                }
              );

              continue;
            }

            // SONG / VIDEO / SHORTS
            if (
              !isMatchArtist(
                artists
              )
            ) {
              continue;
            }

            entries.push(
              {
                country:
                  country.name,

                countryCode:
                  country.code,

                chartType,

                frequency,

                title:
                  item.name ||
                  item.title ||
                  "Unknown",

                artist:
                  artists
                    .map(
                      a =>
                        a.name
                    )
                    .join(
                      ", "
                    ),

                rank:
                  item
                    ?.chartEntryMetadata
                    ?.currentPosition ||
                  null,

                previousRank:
                  item
                    ?.chartEntryMetadata
                    ?.previousPosition ||
                  null,

                views:
                  Number(
                    item.viewCount
                  ) || 0,

                periodsOnChart:
                  item
                    ?.chartEntryMetadata
                    ?.periodsOnChart ||
                  0,

                videoId:
                  item
                    .encryptedVideoId ||
                  item.id ||
                  null,

                thumbnail:
                  item
                    ?.thumbnail
                    ?.thumbnails?.[
                      item
                        .thumbnail
                        .thumbnails
                        .length -
                        1
                    ]?.url ||
                  null
              }
            );
          }
        }
      }
    }

   if (
  entries.length ===
  0
) {
  console.log(
    `⏭ ${country.name}: no chart`
  );

  return [];
}




console.log(
  `✅ ${country.name}: ${entries.length}`
);

return entries;



    return entries;
  } catch (
    err
  ) {
    console.log(
      `❌ ${country.name}: ${err.message}`
    );

    return [];
  }
}

async function readGlobalCache() {
  try {
    const data =
      await fs.readFile(
        GLOBAL_CACHE,
        "utf8"
      );

    return JSON.parse(
      data
    );
  } catch {
    return {
      weekly:
        null,

      daily:
        null
    };
  }
}


async function run() {
  console.log(
    "🚀 Checking Global Chart..."
  );

  await fs.mkdir(
    DATA_DIR,
    {
      recursive:
        true
    }
  );

  // ====================
// GLOBAL CHECKER
// DAILY + WEEKLY
// ====================

const global =
  {
    code:
      "GLOBAL",

    name:
      "Worldwide"
  };

console.log(
  "🌍 Checking Global..."
);

const payload = {
  context: {
    client: {
      clientName:
        "WEB_MUSIC_ANALYTICS",

      clientVersion:
        "2.0",

      hl:
        "en-GB",

      gl:
        "US",

      experimentIds:
        [],

      experimentsToken:
        "",

      theme:
        "MUSIC"
    },

    capabilities:
      {},

    request: {
      internalExperimentFlags:
        []
    }
  },

  browseId:
    "FEmusic_analytics_charts_home",

  query:
    "flags=MusicCharts__enable_apac_and_shorts_charts_expansion&perspective=CHART_HOME&chart_params_country_code=GLOBAL"
};

const globalResponse =
  await axios.post(
    API_URL,
    payload,
    {
      headers: {
        "Content-Type":
          "application/json",

        Origin:
          "https://charts.youtube.com",

        Referer:
          "https://charts.youtube.com/"
      },

      timeout:
        30000
    }
  );

const availableChartsInfo =
  globalResponse.data
    ?.contents
    ?.sectionListRenderer
    ?.contents?.[0]
    ?.musicAnalyticsSectionRenderer
    ?.content
    ?.perspectiveMetadata
    ?.availableChartsInfo
  || [];

const latestWeeklyDate =
  availableChartsInfo.find(
    chart =>
      chart.chartType ===
        "CHART_TYPE_TRACKS"
      &&
      chart.chartPeriodType ===
        "CHART_PERIOD_TYPE_WEEKLY"
  )?.latestEndDate
  || null;

const latestDailyDate =
  availableChartsInfo.find(
    chart =>
      chart.chartType ===
        "CHART_TYPE_VIDEOS"
      &&
      chart.chartPeriodType ===
        "CHART_PERIOD_TYPE_DAILY"
  )?.latestEndDate
  || null;

console.log(
  `📅 Weekly: ${latestWeeklyDate}`
);

console.log(
  `📅 Daily: ${latestDailyDate}`
);

const cache =
  await readGlobalCache();

const weeklyChanged =
  cache.weekly !==
  latestWeeklyDate;

const dailyChanged =
  cache.daily !==
  latestDailyDate;

if (
  !weeklyChanged
  &&
  !dailyChanged
) {
  console.log(
    "⏹ Charts unchanged"
  );

  console.log(
    "Skipping country scan..."
  );

  return;
}

if (
  weeklyChanged
) {
  console.log(
    "📈 Weekly chart changed"
  );
}

if (
  dailyChanged
) {
  console.log(
    "📈 Daily chart changed"
  );
}

await fs.writeFile(
  GLOBAL_CACHE,
  JSON.stringify(
    {
      weekly:
        latestWeeklyDate,

      daily:
        latestDailyDate
    },
    null,
    2
  )
);

// ====================
// SCAN ALL COUNTRIES
// INCLUDING GLOBAL
// ====================

const allEntries =
  [];

const BATCH_SIZE =
  20;

for (
  let i = 0;
  i <
  COUNTRIES.length;
  i +=
    BATCH_SIZE
) {
  const batch =
    COUNTRIES.slice(
      i,
      i +
        BATCH_SIZE
    );

  const results =
    await Promise.all(
      batch.map(
        fetchCountry
      )
    );

  allEntries.push(
    ...results.flat()
  );

  console.log(
    `✅ Batch ${
      Math.floor(
        i /
          BATCH_SIZE
      ) + 1
    } complete`
  );
}

allEntries.sort(
  (a, b) =>
    (a.rank ||
      999) -
    (b.rank ||
      999)
);

// ====================
// SUMMARY
// ====================

const summaryMap =
  {};

for (const item of allEntries) {
  const key =
    `${item.chartType}_${item.frequency}_${item.title}_${item.artist}`;

  if (
    !summaryMap[
      key
    ]
  ) {
    summaryMap[
      key
    ] = {
      chartType:
        item.chartType,

      frequency:
        item.frequency,

      title:
        item.title,

      artist:
        item.artist,

      totalEntries: 0,

      bestRank:
        999,

      countries:
        []
    };
  }

  summaryMap[
    key
  ].totalEntries++;

  summaryMap[
    key
  ].bestRank =
    Math.min(
      summaryMap[
        key
      ].bestRank,
      item.rank ||
        999
    );

  summaryMap[
    key
  ].countries.push(
    {
      country:
        item.country,

      rank:
        item.rank
    }
  );
}

const output =
  {
    updatedAt:
      getKSTTime() +
      " KST",

    latestDates: {
      weekly:
        latestWeeklyDate,

      daily:
        latestDailyDate
    },

    totalEntries:
      allEntries.length,

    entries:
      allEntries,

    summary:
      Object.values(
        summaryMap
      ).sort(
        (
          a,
          b
        ) =>
          b.totalEntries -
          a.totalEntries
      )
  };



await fs.writeFile(
  OUTPUT_FILE,
  JSON.stringify(
    output,
    null,
    2
  )
);

console.log(
  `🔥 ${allEntries.length} entries`
);

console.log(
  `📁 Saved: ${OUTPUT_FILE}`
);

  
}

run().catch(
  console.error
);
