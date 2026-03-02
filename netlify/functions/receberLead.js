exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Método não permitido"
    };
  }

  try {
    const data = JSON.parse(event.body);

    console.log("Lead recebido:", data);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Lead recebido com sucesso",
        recebido: data
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erro ao processar lead"
      })
    };
  }
};
