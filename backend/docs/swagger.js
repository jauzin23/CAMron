const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CAMron API",
      version: "1.0.0",
      description: "API documentation for the project",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    // Apply globally if needed, but it's better to apply per route.
    // security: [ { bearerAuth: [] } ],
  },
  // Paths to find JSDoc comments
  apis: ["./routes/*.js"],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
