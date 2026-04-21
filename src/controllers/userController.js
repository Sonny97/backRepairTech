const users = [
    { id: 1, email: 'ejemplito@google.com', password: '123' },
]

const login = (req, res) => {
    const email = req.query.email;
    const password = req.query.password;
    console.log(email, password);
    users.map(user => {
        if (user.email == email && password == user.password) {
            res.json({ data: true});
        }    })
    res.json({ data: false});
}


// User Controller
const getUsers = (req, res) => {
  res.json({ message: 'Get all users' });
};

const createUser = (req, res) => {
  res.json({ message: 'Create user' });
};

module.exports = {
    login,
  getUsers,
  createUser
};