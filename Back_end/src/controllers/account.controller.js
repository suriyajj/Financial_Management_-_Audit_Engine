const accountService = require("../services/account.service");


//account creation
//One user can have multiple accounts
async function create(req, res, next) {
  try {
    const account = await accountService.create(
      req.user.id,
      req.body.initialBalance
    );

    res.status(201).json({
      status: 201,
      message: "Account created successfully",
      data: account,
    });
  } catch (error) {
    next(error);
  }
}




async function list(req, res, next) {
  try {
    const accounts = await accountService.list(req.user.id);

    res.status(200).json({
      status: 200,
      message: "Accounts fetched successfully",
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  list,
};