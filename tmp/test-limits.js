const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getWorkspaceLimits } = require('./src/lib/server/subscription');

async function test() {
  try {
    // 1. Tentar buscar um workspace sem PlatformSubscription
    // (Apenas para simular a lógica, não precisamos rodar de verdade no DB se não tivermos dados)
    console.log('Testing getWorkspaceLimits logic structure...');
    
    // Verificando se as funções estão exportadas
    if (typeof getWorkspaceLimits === 'function') {
      console.log('getWorkspaceLimits is a function.');
    } else {
      console.log('getWorkspaceLimits is NOT a function!');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
