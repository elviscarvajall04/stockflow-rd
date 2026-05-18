const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../config/db");
const logger = require("../config/logger");

// REGISTRO
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // VALIDACIONES
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    if (!email || email.trim() === "") {
      return res.status(400).json({ message: "El correo es obligatorio" });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    // VERIFICAR SI YA EXISTE
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        message: "El correo ya está registrado",
      });
    }

    // ENCRIPTAR PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // INSERTAR USUARIO
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
      [name, email, hashedPassword, role || "employee"]
    );

    res.status(201).json({
      message: "Usuario registrado correctamente",
      user: result.rows[0],
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error registrando usuario" });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // VALIDACIONES
    if (!email || email.trim() === "") {
      return res.status(400).json({ message: "El correo es obligatorio" });
    }

    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "La contraseña es obligatoria" });
    }

    // BUSCAR USUARIO
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    const user = result.rows[0];

    // COMPARAR PASSWORD
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    // GENERAR TOKEN
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error iniciando sesión" });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token requerido" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      ignoreExpiration: true,
    });

    const result = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const user = result.rows[0];
    const newToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token: newToken });
  } catch (error) {
    logger.error(error);
    res.status(401).json({ message: "Token inválido o expirado" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "El correo es obligatorio" });
    }

    const user = await pool.query("SELECT id FROM users WHERE email = $1", [email]);

    await pool.query("DELETE FROM password_resets WHERE expires_at < NOW()");

    let resetUrl = null;
    if (user.rows.length > 0) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      const fetchUrl = `${req.protocol}://${req.get("host")}`;
      const frontendUrl = process.env.FRONTEND_URL || fetchUrl;
      resetUrl = `${frontendUrl}/reset-password?token=${token}`;

      await pool.query(
        "INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)",
        [user.rows[0].id, token, expiresAt]
      );
    }

    res.json({
      message: resetUrl
        ? "Enlace de recuperación generado"
        : "No hay cuenta con ese correo",
      resetUrl,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error generando recuperación" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token y contraseña son obligatorios" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    const result = await pool.query(
      "SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW()",
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      result.rows[0].user_id,
    ]);

    await pool.query("DELETE FROM password_resets WHERE id = $1", [
      result.rows[0].id,
    ]);

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error restableciendo contraseña" });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
};