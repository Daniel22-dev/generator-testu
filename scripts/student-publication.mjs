import {scanStudentHtml,scanPublicationDirectory,scanGitHistory,preparePublication,readUtf8} from './student-publication-lib.mjs';
const [command,...args]=process.argv.slice(2);
try {
  let result;
  if(command==='file'&&args.length===1)result=scanStudentHtml(readUtf8(args[0]));
  else if(command==='directory'&&args.length===1)result=scanPublicationDirectory(args[0]);
  else if(command==='history'&&args.length===1)result=scanGitHistory(args[0]);
  else if(command==='prepare'&&args.length===3)result=preparePublication(...args);
  else throw new Error('Usage: student-publication.mjs file HTML | directory DIR | history GIT_DIR | prepare STUDENT_HTML PRIVATE_VERIFIER_HTML NEW_DIR');
  console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='PASS'?0:1;
}catch(e){console.error(JSON.stringify({status:'FAIL',error:e.message}));process.exitCode=1;}
