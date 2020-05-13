const Parser = require("rss-parser");
const { inspect } = require("util");
const fs = require("fs");
const readline = require("readline");
const path = require("path");
const EventEmitter = require("events");

class Papi extends EventEmitter {
  constructor() {
    super();
    this.baseURL = "https://rarbg.to/rssdd_magnet.php?categories=";
    this.parser = new Parser();
    this.feed = null;
  }

  save(films) {
    console.log("Saving to files...");
    const dataDirPath = path.join(__dirname, "../data")
    fs.mkdirSync(dataDirPath,{recursive : true})
    const lnks_path = path.join(dataDirPath, "lnks.txt")
    const titles_path = path.join(dataDirPath, "movies.txt")
    this.lnks_stream = fs.createWriteStream(lnks_path, { flags: "a" });
    this.title_stream = fs.createWriteStream(titles_path, { flags: "a" });

    const handleStreamFinish = (path) =>
      console.log(`Wrote all the array data to file ${path}`);
    const handleStreamError = (e, path) =>
      console.error(`There is an error writing the file ${path} => ${e}`);

    this.lnks_stream
      .on("finish", () => handleStreamFinish(this.lnks_stream.path))
      .on("error", (err) => handleStreamError(err, this.lnks_stream.path));

    this.title_stream
      .on("finish", () => handleStreamFinish(this.title_stream.path))
      .on("error", (err) => handleStreamError(err, this.title_stream.path));

    films.forEach((film) => {
      this.title_stream.write(`${film.title}\n`);
      this.lnks_stream.write(`${film.link}\n`);
    });
    this.lnks_stream.end();
    this.title_stream.end();
  }

  setCategories(...data) {
    this.categories = data;
  }

  async getFilms() {
    await this.checkFeed();
    const films = await this.processFeed();
    return films;
  }

  poll() {
    this.addListener("feed", this.processFeed.bind(this));
    this.addListener("processed", this.save.bind(this));
    let agent = null;
    try {
      agent = setInterval(async () => {
        try {
          await this.checkFeed();
        } catch (e) {
          throw e;
        }
      }, 300000);
    } catch (error) {
      console.error(`Something went wrong polling feed\n${error}`);
      clearInterval(agent);
    }
  }

  getOnlyNewFilms(films) {
    return new Promise((resolve, reject) => {
      try {
        const existingMoviesPath = path.resolve(__dirname, "../data/movies.txt");
        const stream = fs.createReadStream(existingMoviesPath, {
          encoding: "utf8",
        });

        stream.on("error", (e) => {
          if (e.code === "ENOENT") {
            console.error("No existing films. Good to go...");
            return resolve(films);
          } else {
            return reject(e);
          }
        });

        const rl = readline.createInterface({
          input: stream,
        });

        rl.on("line", (lnk) => {
          const index = films.findIndex(({ title }) => {
            return lnk == title;
          });
          if (index !== -1) {
            console.log(`Already have "${films[index].title}". Removing...`);
            films.splice(index, 1);
          }
        });

        rl.once("close", () => {
          console.log("Finished checking existing links.");
          return resolve(films);
        });
      } catch (e) {
        console.error(`Error checking existing links: ${inspect(e)}`);
        return reject(e);
      }
    });
  }

  async processFeed() {
    const item_map = {};
    let processed = [];
    const items = this.feed.items;
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const key = item.title.substring(0, 10);

      item_map.hasOwnProperty(key)
        ? item_map[key].push(item)
        : (item_map[key] = [item]);
    }

    for (const key in item_map) {
      const data = item_map[key];

      const hdrIndex = data.findIndex((x) =>
        x.title.toUpperCase().includes("HDR")
      );
      const x265Index = data.findIndex((x) =>
        x.title.toUpperCase().includes("X265")
      );
      const x264Index = data.findIndex((x) =>
        x.title.toUpperCase().includes("X264")
      );

      if (hdrIndex !== -1) {
        processed.push(data[hdrIndex]);
      } else if (x265Index !== -1) {
        processed.push(data[x265Index]);
      } else if (x264Index !== -1) {
        processed.push(data[x264Index]);
      } else {
        processed.push(data[0]);
      }
    }

    processed = processed.sort((a, b) => {
      a = a.title.toLowerCase();
      b = b.title.toLowerCase();

      if (a < b) {
        return -1;
      } else if (a > b) {
        return 1;
      } else return 0;
    });

    processed = await this.getOnlyNewFilms(processed);

    this.emit("processed", processed);
    return processed;
  }

  async checkFeed() {
    console.log("Checking Feed");
    try {
      const feedURL = `${this.baseURL}${this.categories.join(";")}`;
      this.feed = await this.parser.parseURL(feedURL);
      this.emit("feed", this.feed);
      return this;
    } catch (e) {
      console.error(`Error checking feed: ${inspect(e)}`);
      throw e;
    }
  }
}

module.exports = Papi;
