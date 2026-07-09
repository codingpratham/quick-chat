import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Application, Request, Response } from 'express';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BobBuilder API',
            version: '1.0.0',
            description: 'REST API documentation for BobBuilder',
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'token',
                }
            },
        },
        security: [
            {
                cookieAuth: [],
            },
        ],
    },
    apis: ['./src/router.ts', './src/controller/*.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Application) {
    // Swagger page
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Docs in JSON format
    app.get('/api-docs.json', (req: Request, res: Response) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}
