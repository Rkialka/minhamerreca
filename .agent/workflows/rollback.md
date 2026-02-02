---
description: Como voltar para a versão estável anterior
---

Se você não gostar das novas mudanças ou algo der errado, você pode voltar para a versão que estava funcionando perfeitamente seguindo estes passos:

1. Abra o terminal no diretório do projeto.
2. Execute o comando para descartar as mudanças atuais e voltar para a versão salva:
   ```bash
   git checkout v1-stable-premium
   ```
3. Se quiser voltar a desenvolver as novas funcionalidades depois:
   ```bash
   git checkout feature/level-2-upgrade
   ```

*Nota: Todas as suas merrecas (dados) estão salvas no Firebase, então elas estarão lá independente da versão do código que você estiver usando!*
