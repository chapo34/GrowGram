import jwt from 'jsonwebtoken';

const payload = { userId: 'u_test123', email: 'test@example.com' };
const secret  = 'DEV_SUPER_SECRET';      // muss zu deiner .runtimeconfig.json passen
const opts    = { expiresIn: '1d' };

const token = jwt.sign(payload, secret, opts);
console.log(token);
