const generateNCF = async (client, type = "B02") => {
  // Lock row to prevent duplicate NCFs under concurrent sales
  const seqResult = await client.query(
    `UPDATE ncf_sequences
     SET current_number = current_number + 1
     WHERE type = $1 AND is_active = true
     RETURNING prefix, current_number`,
    [type]
  );

  if (seqResult.rows.length === 0) {
    throw new Error(`No hay secuencia NCF activa para tipo ${type}`);
  }

  const { prefix, current_number } = seqResult.rows[0];
  return `${prefix}-${String(current_number).padStart(8, "0")}`;
};

const getNCFSequences = async (pool) => {
  const result = await pool.query(
    "SELECT * FROM ncf_sequences ORDER BY type"
  );
  return result.rows;
};

const updateNCFSequence = async (pool, id, updates) => {
  const { type, prefix, current_number, valid_from, valid_until, is_active } = updates;
  const result = await pool.query(
    `UPDATE ncf_sequences
     SET type = COALESCE($1, type),
         prefix = COALESCE($2, prefix),
         current_number = COALESCE($3, current_number),
         valid_from = COALESCE($4, valid_from),
         valid_until = COALESCE($5, valid_until),
         is_active = COALESCE($6, is_active)
     WHERE id = $7
     RETURNING *`,
    [type, prefix, current_number, valid_from, valid_until, is_active, id]
  );
  return result.rows[0];
};

module.exports = { generateNCF, getNCFSequences, updateNCFSequence };
