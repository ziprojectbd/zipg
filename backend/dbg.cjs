const mongoose = require("mongoose");
const uri = "mongodb+srv://mdzikrulislamjuwel_db_user:Yc6Us5gSGs7b6scZ@cluster0.fnzzlie.mongodb.net/zipay?appName=Cluster0";
(async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const rows = await db.collection("smstransactions").find({}).sort({createdAt:-1}).limit(3).toArray();
  for (const r of rows) {
    console.log("---");
    console.log("status:", r.status, "| provider:", r.provider);
    console.log("amount:", r.amount, "| txnId:", r.transactionId, "| sender:", r.senderPhone);
    console.log("error:", r.errorMessage || "none");
    console.log("raw:", (r.rawSms || "").slice(0, 100));
  }
  process.exit(0);
})().catch(e => { console.error("ERR", e.message); process.exit(1); });