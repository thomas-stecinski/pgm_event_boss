const URL = "http://localhost:3001";

async function getToken(name, userId) {
  const res = await fetch(`${URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, userId }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log("=== Test 1 : Création d'un pseudo ===");
  const r1 = await getToken("Alex", "browser-111");
  console.log("Status:", r1.status, "| Data:", r1.data);
  // Attendu : 200 OK

  console.log("\n=== Test 2 : Même pseudo, même navigateur (récupération session) ===");
  const r2 = await getToken("Alex", "browser-111");
  console.log("Status:", r2.status, "| Data:", r2.data);
  // Attendu : 200 OK

  console.log("\n=== Test 3 : Même pseudo, autre navigateur (doit échouer) ===");
  const r3 = await getToken("Alex", "browser-222");
  console.log("Status:", r3.status, "| Data:", r3.data);
  // Attendu : 409 PSEUDO_TAKEN

  console.log("\n=== Test 4 : Pseudo différent, autre navigateur ===");
  const r4 = await getToken("Marie", "browser-222");
  console.log("Status:", r4.status, "| Data:", r4.data);
  // Attendu : 200 OK

  console.log("\n=== Test 5 : Casse différente (alex vs Alex) ===");
  const r5 = await getToken("alex", "browser-333");
  console.log("Status:", r5.status, "| Data:", r5.data);
  // Attendu : 409 PSEUDO_TAKEN (comparaison case-insensitive)
}

run().catch(console.error);
