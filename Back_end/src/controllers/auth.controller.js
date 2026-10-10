const authService = require("../services/auth.service");
const { AppError } = require("../utils/errors");
const env = require("../config/env");
const { pool } = require("../config/postgres");

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
//http only cookie
const cookieOptions = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: "strict",
};


//set http only cookie for access token
function setAuthenticationCookies(res, tokens) {
  res.cookie("accessToken", tokens.accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  //for refresh token
  res.cookie("refreshToken", tokens.refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

//register
async function register(req, res, next) {
  try {
    const user = await authService.register(
      req.body.name,
      req.body.email,
      req.body.password
    );

    res.status(201).json({
      status: 201,
      message: "User registered successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

//Login
async function login(req, res, next) {
  try {
    const tokens = await authService.login(
      req.body.email,
      req.body.password
    );

    setAuthenticationCookies(res, tokens);

    res.status(200).json({
      status: 200,
      message: "Login successful",
      data: {
        user: {
          id: tokens.user.id,
          name: tokens.user.name,
          email: tokens.user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}



//for check auth
async function getCurrentUser(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT id, name, email, created_at
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(
        404,
        "USER_NOT_FOUND",
        "User not found"
      );
    }

    const user = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    return next(error);
  }
}

//refresh the 

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError(401, "REFRESH_TOKEN_REQUIRED", "Refresh token is required");
    }

    const tokens = await authService.refresh(refreshToken);

    setAuthenticationCookies(res, tokens);

    res.status(200).json({
      status: 200,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    next(error);
  }
}

//generate acces token -refresh token using bearer token 
//generate if the acess token is alive 
//if the token is revoked or the refresh token is not alive it throws an error
async function refreshUsingBearer(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        status: 401,
        error: "REFRESH_TOKEN_REQUIRED",
        message: "Refresh token must be provided in a Bearer token",
      });
    }

    const refreshToken = authorization.substring(7);
    const result = await authService.refreshUsingToken(refreshToken);

    return res.status(200).json({
      status: 200,
      message: "Access token refreshed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

//revoke the cookies from the clients browser
async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;

    await authService.logout(refreshToken);

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    res.status(200).json({
      status: 200,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  refreshUsingBearer,
  getCurrentUser
};