import React from "react";
import {AbsoluteFill,Img,staticFile,useCurrentFrame,spring,useVideoConfig} from "remotion";
import {TriviaSlide} from "../episodes";
import {ResolvedSlide} from "../slides";
import {fontFamily} from "../theme";
const colors=["#ffca42","#a98bff","#65d8ce","#ff946e","#6cb7ff"];
export const RankingPage:React.FC<{slide:TriviaSlide;resolved:ResolvedSlide}>=({slide,resolved})=>{
 const frame=useCurrentFrame();const {fps}=useVideoConfig();const rank=slide.rank;
 const color=colors[(rank??5)-1];const answer=resolved.answerStart!==null&&frame>=resolved.answerStart;
 const pop=spring({frame:answer?frame-resolved.answerStart!:frame,fps,config:{damping:16}});
 return <AbsoluteFill style={{background:"#10182c",color:"white",fontFamily,overflow:"hidden"}}>
  <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 70% 35%, ${color}33, transparent 65%)`}}/>
  <div style={{position:"absolute",top:110,left:70,right:70,display:"flex",justifyContent:"space-between",alignItems:"center",fontWeight:900,fontSize:34,color}}><span>身近なモノのヒミツ</span><span>TOP 5</span></div>
  <div style={{position:"absolute",top:210,left:70,fontSize:rank?108:54,fontWeight:900,color,lineHeight:1}}>{rank?`第 ${rank} 位`:"知ると誰かに話したくなる"}</div>
  <div style={{position:"absolute",top:rank?390:370,left:65,right:65,fontWeight:900,fontSize:rank?86:118,lineHeight:1.2,whiteSpace:"pre-line",letterSpacing:"-.03em"}}>{slide.text}</div>
  <div style={{position:"absolute",top:rank?670:860,left:80,right:80,height:rank?455:560,background:"#ffffff0c",borderRadius:70,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${color}44`}}><Img src={staticFile(`illustrations/${slide.image}`)} style={{width:740,height:rank?420:510,objectFit:"contain",transform:`translateY(${Math.sin(frame/15)*6}px)`}}/></div>
  {answer?<div style={{position:"absolute",top:1210,left:65,right:65,background:color,color:"#10182c",borderRadius:34,padding:"40px 30px",textAlign:"center",fontSize:94,fontWeight:900,lineHeight:1.15,whiteSpace:"pre-line",transform:`scale(${.92+.08*pop})`}}>{slide.answer}</div>:null}
  {answer&&slide.note?<div style={{position:"absolute",top:1550,left:65,right:65,fontSize:38,fontWeight:800,textAlign:"center",color:"#d8e2f4"}}>{slide.note}</div>:null}
  <div style={{position:"absolute",left:70,right:70,bottom:120,display:"flex",gap:12}}>{[5,4,3,2,1].map(n=><div key={n} style={{height:8,flex:1,borderRadius:5,background:rank&&n>=rank?color:"#ffffff25"}}/>)}</div>
 </AbsoluteFill>;
};
