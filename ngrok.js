const ngrok = require("ngrok");

(async function () {
  const url = await ngrok.connect({
    addr: 3000,
    authtoken: "3Ehk3wSXwD2T52pruKG1kxbPut6_6s8N1vgrVrMQL93xUE4mb",
  });
  console.log("\n✅ Your app is now PUBLIC at:");
  console.log(`🌐 ${url}\n`);
  console.log("Press Ctrl+C to stop.\n");
})();
