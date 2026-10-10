const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const cors=require("cors")

const {
  requestIdMiddleware,
} = require("./middleware/requestId.middleware");

const {
  requestLoggerMiddleware,
} = require("./middleware/requestLogger.middleware");

const {
  errorMiddleware,
} = require("./middleware/error.middleware");

const {
  authenticate,
} = require("./middleware/auth.middleware");




const authRoutes = require("./routes/auth.routes");

const accountRoutes = require("./routes/account.routes");

const transferRoutes = require("./routes/transfer.routes");

const logsRoutes = require("./routes/logs.routes");

const app = express();


//disclosing x powered by to not share in an http that it is not using express 
app.disable("x-powered-by");

app.use(helmet());  //used to secure http header

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials:true
  })
);



//for an http only cookie
app.use(cookieParser());


app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);



app.use("/auth", authRoutes);


app.use(
  "/api/account",
  authenticate,
  accountRoutes
);

app.use(
  "/account",
  authenticate,
  transferRoutes
);

app.use(
  "/logs",
  authenticate,
  logsRoutes
);


//for an error handling
app.use(errorMiddleware);

module.exports = app;