
const { hash, compare } = require('bcryptjs');
const AppError = require('../utils/AppError.js')

const sqliteConnection = require("../database/sqlite");
const { application } = require('express');

class UsersControllers {
  async create(request, response){
    const { name, email, password } = request.body

    const database = await sqliteConnection()
    const checkUserExists = await database.get('SELECT * FROM users WHERE email = (?)', [email])

    if (checkUserExists) {
      throw new AppError("Este e-mail já está em uso")
    }

    const hashedPassword = await hash(password, 8)

    await database.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?) ', 
    [name, email, hashedPassword])

    return response.status(201).json()
  }

  async update(request, response){
    const { name, email, password, old_password } = request.body
    const { id } = request.params


    const database = await sqliteConnection();
    const user = await database.get('SELECT * FROM users WHERE id = (?)', [id])

    if(!user){
      throw new AppError('Usuario inexistente')
    }


    const userUpdatedEmail = await database.get('SELECT * FROM users WHERE email = (?)', [email])

    if(userUpdatedEmail && userUpdatedEmail.id !== user.id){
      throw new AppError('Este email já está sendo utilizado')
    }

    user.name = name ?? user.name
    user.email = email ?? user.email

    if(password && !old_password){
      throw new AppError('Você deve enviar sua senha antiga para poder atualizar a senha')
    }

    if(password && old_password){
      const verifyPassword = await compare(old_password, user.password)

      if(!verifyPassword){
        throw new AppError('A senha antiga não está correta.')
      }

      user.password = await hash(password, 8)
    }


    await database.run(`
    UPDATE users SET
    name = ?,
    email = ?,
    password = ?,
    updated_at = DATETIME('now')
    WHERE id = ?
    `, [user.name, user.email, user.password, id])

    return response.status(200).json()
  }
}

module.exports = UsersControllers