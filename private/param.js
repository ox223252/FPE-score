// fichier de logs par le nom des fichiers et celui des 
// fichier present dans ce dossier précedé de private
// si le fiochier n'existe pas il sera créé automatiquement
scoreDataBase = './private/score.json';
voieDataBase = './private/voie.json';
userDataBase = './private/users.json';

// port de connection pour l'interface web,
// fpe-score.local:port (dans le cas du port 80 nous 
// n'avons pas besoin de le noter)
port = 6080;

// taille de la clée de securitée plus c'est grand mieux 
// c'est mais plus c'est long à générer
// une nouvelle clée est généré à chaque redemarage du 
// système
// 2^n
// 2014
// 2048
// 4096
// 8192
keySize = 1024;

// autre : contest combine enfant (petits percheron)
// bloc : règles féderales de bloc
// combine :  règles féderales de combiné
// diffculte :  règles féderales de difficulté
// vitesse :  règles féderales de vitesse
mode = "a";
