import "dotenv/config";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";

console.log("🔥 V2 SERVER.JS IS RUNNING");

const PORT = process.env.PORT || 3001;

connectDB()
  .then(() => {
    console.log(
      "🔥 EXPRESS ROUTES:",
      app.router?.stack?.map((layer) => ({
        path: layer.route?.path,
        methods: layer.route?.methods,
        name: layer.name,
      }))
    );

    app.listen(PORT, () => {
      console.log(
        `🚀 D'Lume Biz server running on port ${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error(
      "❌ SERVER STARTUP FAILED:",
      error
    );
    process.exit(1);
  });