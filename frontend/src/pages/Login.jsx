import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { KeyIcon, UserIcon } from "@heroicons/react/24/outline";
const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(username, password);
    if (success) {
      navigate("/reception");
    }
    setLoading(false);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800">
      {" "}
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {" "}
        <div className="text-center mb-8">
          {" "}
          <h1 className="text-3xl font-bold text-gray-800">
            Motel Manager Pro
          </h1>{" "}
          <p className="text-gray-600 mt-2">Sistema de Gestão</p>{" "}
        </div>{" "}
        <form onSubmit={handleSubmit} className="space-y-6">
          {" "}
          <div>
            {" "}
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {" "}
              Usuário{" "}
            </label>{" "}
            <div className="relative">
              {" "}
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {" "}
                <UserIcon className="h-5 w-5 text-gray-400" />{" "}
              </div>{" "}
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Digite seu usuário"
                required
              />{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {" "}
              Senha{" "}
            </label>{" "}
            <div className="relative">
              {" "}
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {" "}
                <KeyIcon className="h-5 w-5 text-gray-400" />{" "}
              </div>{" "}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Digite sua senha"
                required
              />{" "}
            </div>{" "}
          </div>{" "}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {" "}
            {loading ? "Entrando..." : "Entrar"}{" "}
          </button>{" "}
        </form>{" "}
      </div>{" "}
    </div>
  );
};
export default Login;