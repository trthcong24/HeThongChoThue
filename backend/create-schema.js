const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function runSchema() {
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "hethongchothue"
  });

  try {
    const sqlFile = path.join(__dirname, "schema-user.sql");
    let sql = fs.readFileSync(sqlFile, "utf8");
    
    // Remove comments
    sql = sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
    
    // Split by semicolon
    const statements = sql.split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`Found ${statements.length} SQL statements\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      // Skip USE statements
      if (stmt.toUpperCase().startsWith('USE ')) continue;
      
      try {
        await conn.execute(stmt);
        const preview = stmt.substring(0, 70).replace(/\n/g, ' ');
        console.log(`✓ [${i+1}] ${preview}...`);
      } catch (err) {
        const preview = stmt.substring(0, 70).replace(/\n/g, ' ');
        // Ignore table already exists errors
        if (err.message.includes("already exists") || err.message.includes("Duplicate")) {
          console.log(`✓ [${i+1}] Skipped: ${preview}...`);
        } else {
          console.error(`✗ [${i+1}] Error: ${err.message}`);
          console.error(`   SQL: ${preview}...`);
        }
      }
    }

    console.log("\n✓ Schema creation completed!");
    await conn.end();
  } catch (error) {
    console.error("Fatal error:", error.message);
    process.exit(1);
  }
}

runSchema();
