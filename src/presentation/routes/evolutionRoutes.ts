import { Router } from 'express';
import { criarInstancia, 
    gerarQRPairing,
    statusInstancia,
    listarInstancias,
    deletarInstancia,
    logoutInstancia,
    restartInstancia
} from '../../presentation/controllers/EvolutionController';
const router = Router();

router.post('/instance/create', criarInstancia);
router.get('/instance/connect/:nome', gerarQRPairing);
//router.get('/status/:nome', statusInstancia); // Não está retornando o status correto, aguardar correção do problema
router.get('/instance/fetchInstances', listarInstancias);  // Rota para listar instâncias, pode verificar status por aqui
router.delete('/instance/delete/:instance', deletarInstancia);
router.delete('/instance/logout/:instance', logoutInstancia); 
router.put('/instance/restart/:instance', restartInstancia);

export default router;
