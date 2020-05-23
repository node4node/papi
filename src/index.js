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

const papi = new Papi();
papi.setCategories(50, 51, 52);
papi
  .poll()
