import{c as d,J as m,j as e,B as h,d as s}from"./index-CsF_XFvG.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]],f=d("star",x);function g({entityType:a,entityId:o,entityName:r,size:l="sm",className:n}){const{isFavorite:i,toggleFavorite:c}=m(),t=i(a,o),v=u=>{u.stopPropagation(),c(a,o,r)};return e.jsx(h,{variant:"ghost",size:l==="sm"?"icon":"default",className:s("h-8 w-8 p-0 hover:bg-transparent",t&&"text-yellow-500 hover:text-yellow-600",!t&&"text-muted-foreground hover:text-yellow-500",n),onClick:v,title:t?"Remove from favorites":"Add to favorites",children:e.jsx(f,{className:s("h-4 w-4 transition-all",t&&"fill-current")})})}export{g as F,f as S};
