import { supabase } from "./src/lib/supabase.js";

const runMigration = async () => {
  try {
    console.log(
      "Running migration to add fuel_type and transmission columns..."
    );

    // Add fuel_type column
    const { error: fuelTypeError } = await supabase.rpc("alter_table", {
      table_name: "vehicles",
      command: "ADD COLUMN IF NOT EXISTS fuel_type VARCHAR DEFAULT 'gasoline'",
    });

    if (fuelTypeError) {
      console.error("Error adding fuel_type column:", fuelTypeError);
      return;
    }

    // Add transmission column
    const { error: transmissionError } = await supabase.rpc("alter_table", {
      table_name: "vehicles",
      command:
        "ADD COLUMN IF NOT EXISTS transmission VARCHAR DEFAULT 'automatic'",
    });

    if (transmissionError) {
      console.error("Error adding transmission column:", transmissionError);
      return;
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  }
};

runMigration();
