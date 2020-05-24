const Papi = require("./papi");

// Using a single function to handle multiple signals
function handleSignal(signal) {
  console.log(`Received Signal: ${signal}`);
  process.exit(0);
}

process.on("SIGINT", handleSignal);
process.on("SIGTERM", handleSignal);
process.on("uncaughtException", (err, origin) => {
  console.error(`Caught exception: ${err}\n` + `Exception origin: ${origin}`);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.log("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

const main = async function () {
  const papi = new Papi();
  papi.setCategories(50, 51, 52);
  const films = await papi.getFilms();
  films.length && papi.save(films);
  console.log("Work Done.");
};

main();

/*
Since RSS is built on the HTTP protocol, in general, most sites should respect the If-Modified-Since 
HTTP header. This is fairly lightweight and most servers should be able to return this information quickly.
So for the client-side, you'll need to keep track of the last time you've sent the request and pass it 
to the server. If the server returns a 304 code, then you'll know that nothing has changed. 
But even more importantly, the server doesn't need to return the feed info, saving bytes of traffic. 
If the server returns a 200, then you'll need to process the results and save the response date.
Ultimately, the answer to this question depends on what type of information is at the other end of 
the RSS feed. If it is a blog, then probably once every 4-8 hours is sufficient. But if RSS feed is a 
feed of stock quote (not likely, just an example), then every 10 minutes is not sufficient.
*/
