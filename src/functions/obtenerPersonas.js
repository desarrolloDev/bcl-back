const { v4 } = require("uuid");
const AWS = require("aws-sdk");

const handler = async (event) => {
  const dataPersonas = [{
    id: v4(),
    nombre: "Jackeline Cardenas",
    edad: 27,
    sexo: "Femenino",
    estadoCivil: "Soltera"
  },
  {
    id: v4(),
    nombre: "John Doe",
    edad: 25,
    sexo: "Masculino",
    estadoCivil: "Soltero"
  }];
  return {
    codigoStatus: 200,
    mensaje: "Listado de personas",
    data: dataPersonas
  };
};

module.exports = {
  handler
};
