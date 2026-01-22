import swaggerJsdoc from 'swagger-jsdoc';
import type { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: '天选后端 API 文档',
    version: '1.0.0',
    description: '天选后端 API 文档 - 包含用户数字孪生系统等所有接口',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: process.env.API_BASE_URL || 'http://localhost:3000/api',
      description: process.env.NODE_ENV === 'production' ? '生产环境' : '开发环境',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Token 认证，格式：Bearer {token}',
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            description: '响应数据',
          },
          message: {
            type: 'string',
            description: '成功消息（可选）',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            description: '错误类型',
          },
          message: {
            type: 'string',
            description: '错误消息（可选）',
          },
        },
      },
      DestinyCard: {
        type: 'object',
        properties: {
          mbti: {
            type: 'string',
            nullable: true,
            example: 'INTJ',
          },
          currentStatus: {
            type: 'string',
            nullable: true,
            example: '刚被裁员，想创业',
          },
          identity: {
            type: 'string',
            nullable: true,
            example: '紫微七杀·化杀为权',
          },
          profession: {
            type: 'string',
            nullable: true,
            example: '独立开发者',
          },
          wishes: {
            type: 'array',
            items: {
              type: 'string',
            },
            nullable: true,
            example: ['财务自由', '家庭和睦'],
          },
          energyLevel: {
            type: 'string',
            enum: ['high', 'balanced', 'low'],
            nullable: true,
            example: 'balanced',
          },
          completeness: {
            type: 'number',
            description: '资料完整度（0-100）',
            example: 60,
          },
          lastUpdated: {
            type: 'string',
            format: 'date-time',
            example: '2026-01-22T15:48:57.602Z',
          },
        },
      },
      CompletenessResult: {
        type: 'object',
        properties: {
          completeness: {
            type: 'number',
            description: '资料完整度（0-100）',
            example: 60,
          },
          breakdown: {
            type: 'object',
            properties: {
              birthData: {
                type: 'object',
                properties: {
                  filled: { type: 'boolean' },
                  score: { type: 'number' },
                  maxScore: { type: 'number' },
                },
              },
              mbti: {
                type: 'object',
                properties: {
                  filled: { type: 'boolean' },
                  score: { type: 'number' },
                  maxScore: { type: 'number' },
                },
              },
              profession: {
                type: 'object',
                properties: {
                  filled: { type: 'boolean' },
                  score: { type: 'number' },
                  maxScore: { type: 'number' },
                },
              },
              currentStatus: {
                type: 'object',
                properties: {
                  filled: { type: 'boolean' },
                  score: { type: 'number' },
                  maxScore: { type: 'number' },
                },
              },
              wishes: {
                type: 'object',
                properties: {
                  filled: { type: 'boolean' },
                  score: { type: 'number' },
                  maxScore: { type: 'number' },
                },
              },
            },
          },
          nextRewardThreshold: {
            type: 'number',
            nullable: true,
            description: '下一个奖励阈值',
            example: 70,
          },
        },
      },
      RewardEvent: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['COIN_GRANTED', 'THRESHOLD_REACHED', 'COMPLETENESS_INCREASED'],
          },
          coins: {
            type: 'number',
            nullable: true,
            description: '奖励的天机币数量',
          },
          reason: {
            type: 'string',
            nullable: true,
            description: '奖励原因',
          },
          field: {
            type: 'string',
            nullable: true,
            description: '触发奖励的字段',
          },
          threshold: {
            type: 'number',
            nullable: true,
            description: '达到的阈值',
          },
        },
      },
      ImplicitTraits: {
        type: 'object',
        properties: {
          inferred_roles: {
            type: 'array',
            items: { type: 'string' },
            example: ['parent', 'spouse'],
          },
          interest_tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['wealth', 'career'],
          },
          profession_hints: {
            type: 'array',
            items: { type: 'string' },
            example: ['tech', 'finance'],
          },
          risk_tolerance: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            nullable: true,
          },
          interaction_style: {
            type: 'string',
            enum: ['brief', 'detailed', 'balanced'],
            nullable: true,
          },
          last_active_topic: {
            type: 'string',
            nullable: true,
          },
          family_structure: {
            type: 'object',
            nullable: true,
            properties: {
              has_spouse: { type: 'boolean' },
              has_children: { type: 'boolean' },
              children_count: { type: 'number' },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: '用户数字孪生',
      description: '用户数字孪生系统相关接口',
    },
    {
      name: '命主名刺',
      description: '命主名刺（用户上下文）相关接口',
    },
    {
      name: '资料完整度',
      description: '资料完整度计算和奖励相关接口',
    },
    {
      name: '隐性信息',
      description: '隐性特征信息相关接口',
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
