import { app } from "./app.js";
import { seedCuisineLabels } from "./db/cuisine-seed.js";

const port = Number(process.env.PORT ?? 3000);

await seedCuisineLabels();

app.listen(port, "0.0.0.0", () => {
  console.info(`BiteBuddy API listening on port ${port}.`);
});
