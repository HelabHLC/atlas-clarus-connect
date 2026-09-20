# Full ATLAS Clarus Designer Layer candidate generator.
# PKL identity is read-only; names and descriptors are an external sidecar.
for(p in c("munsellinterpol","jsonlite","digest"))if(!requireNamespace(p,quietly=TRUE))stop("Missing package: ",p)
stopifnot(utils::packageVersion("munsellinterpol")==base::package_version("3.6-0"))
MASTER <- "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"
source <- jsonlite::fromJSON("hover-library/data/colors.json",simplifyVector=FALSE)
stopifnot(source$master_sha256==MASTER,source$entry_count==13283L,length(source$colors)==13283L)
settings <- list(xyC="NBS",hcinterp="bicubic",vinterp="cubic",VfromY="ASTM",rtol=1e-8,atol=1e-6,warn=TRUE)
fixture <- munsellinterpol::ColorBlockFromMunsell(c("3R 8/3","7.4YR 3/4"))
stopifnot(identical(as.integer(fixture$Number),c(4L,58L)))
hvc_matrix <- function(x){if(is.data.frame(x)&&"HVC"%in%names(x))x<-x$HVC;if(is.data.frame(x)&&all(c("H","V","C")%in%names(x)))x<-as.matrix(x[,c("H","V","C"),drop=FALSE]);if(is.numeric(x)&&is.null(dim(x))&&length(x)==3L)x<-matrix(x,nrow=1L);if(!is.matrix(x)||!is.numeric(x)||!identical(dim(x),c(1L,3L))||any(!is.finite(x)))return(NULL);x}
cap <- function(fun){w<-character();e<-NULL;v<-tryCatch(withCallingHandlers(fun(),warning=function(x){w<<-c(w,conditionMessage(x));invokeRestart("muffleWarning")}),error=function(x){e<<-conditionMessage(x);NULL});list(v=v,w=unique(w),e=e)}
lightness <- function(L)if(L<20)"Very dark" else if(L<35)"Dark" else if(L<50)"Medium dark" else if(L<65)"Medium" else if(L<80)"Medium light" else if(L<90)"Light" else "Very light"
chroma <- function(C)if(C<=5)"Neutral" else if(C<=15)"Soft" else if(C<=35)"Muted" else if(C<=60)"Moderate" else "Vivid"
temperature <- function(H)if(H>=330||H<115)"Warm" else if(H<145)"Warm neutral" else if(H<=295)"Cool" else "Cool neutral"
family <- function(name,H){n<-tolower(name);keys<-c("purple","violet","blue","green","olive","yellow","orange","brown","red","pink","gray","white","black");hit<-keys[vapply(keys,function(k)grepl(k,n,fixed=TRUE),logical(1))];if(length(hit))tools::toTitleCase(tail(hit,1)) else if(H<30||H>=345)"Red" else if(H<75)"Orange" else if(H<115)"Yellow" else if(H<170)"Green" else if(H<260)"Blue" else if(H<310)"Violet" else "Purple"}
role <- function(L,C){unique(c(if(L>=80)"Light background" else if(L<=30)"Dark foundation" else "Secondary colour",if(C>=60)"Attention accent" else if(C<=15)"Quiet neutral" else "Supporting colour"))}
base_hue <- function(name){
 x<-tolower(name)
 x<-sub("^(very (dark|deep|light|pale)|brilliant|dark|deep|grayish|light|medium|moderate|pale|strong|vivid) +","",x)
 tools::toTitleCase(x)
}
designer_name <- function(std,L,C){
 paste(gsub(" ","-",lightness(L)),tolower(chroma(C)),tolower(base_hue(std)))
}
one <- function(s, expected_id){
 id<-as.integer(s$id);ref<-as.character(s$ref);m<-regexec("^H([0-9]{3})_L([0-9]{3})_C([0-9]{3})$",ref);q<-as.numeric(regmatches(ref,m)[[1]][2:4]);H<-q[1];L<-q[2];C<-q[3]
 stopifnot(id>=0L,id<13283L,id==expected_id)
 conv<-cap(function()do.call(munsellinterpol::LabToMunsell,c(list(Lab=matrix(as.numeric(unlist(s$lab)),nrow=1L),white="D50",adapt="Bradford"),settings)));hvc<-hvc_matrix(conv$v)
 block<-if(is.null(hvc))list(v=NULL,w=character(),e="No finite HVC") else cap(function()munsellinterpol::ColorBlockFromMunsell(hvc))
 ok<-is.data.frame(block$v)&&nrow(block$v)==1L&&all(c("Number","Name")%in%names(block$v))&&!is.na(block$v$Number[1])&&!is.na(block$v$Name[1])&&length(conv$w)==0L&&length(block$w)==0L&&is.null(conv$e)&&is.null(block$e)
 std<-if(ok)tools::toTitleCase(tolower(as.character(block$v$Name[1]))) else NULL
 lc<-lightness(L);cc<-chroma(C);fam<-if(ok)family(std,H) else NULL;temp<-temperature(H)
 dname<-if(ok)designer_name(std,L,C) else NULL
 list(atlas_row_id=id,reference=ref,standard_name_en=std,standard_name_number=if(ok)as.integer(block$v$Number[1])else NULL,designer_name_en=if(ok)tools::toTitleCase(dname)else NULL,display_name=if(ok)paste(tools::toTitleCase(dname),ref,sep=" · ")else ref,colour_family=fam,hue_character=if(ok)paste(temp,fam)else NULL,lightness_character=lc,chroma_character=cc,temperature=temp,neutrality=if(C<=5)"Neutral" else if(C<=20)"Near neutral" else "Chromatic",visual_weight=if(L<35||C>60)"Strong" else if(L>80&&C<20)"Light" else "Medium",search_terms_en=if(ok)unique(tolower(c(fam,temp,lc,cc,strsplit(std," ")[[1]])))else character(),suggested_roles=role(L,C),munsell_hvc=if(is.null(hvc))NULL else as.numeric(hvc[1,]),calculation_status=if(ok)"COMPUTED"else"OPEN",warnings=unique(c(conv$w,block$w)),error=conv$e%||%block$e,review_status="NOT_INDEPENDENTLY_REVIEWED",public_release=FALSE)
}
`%||%` <- function(a,b)if(is.null(a))b else a
records<-vector("list",13283L)
for(i in seq_along(source$colors)){records[[i]]<-one(source$colors[[i]],i-1L);if(i%%250L==0L)message(i," / 13283")}
counts<-table(vapply(records,function(x)x$calculation_status,character(1)))
out<-list(schema="ATLAS_CLARUS_DESIGNER_LAYER",schema_version="0.1",status="COMPUTED_CANDIDATES_NOT_RELEASED",source_master=list(filename=source$master_file,sha256=MASTER,expected_records=13283L,identity_authority="PKL_FULL_REFERENCE"),join_contract=list(cardinality="ONE_TO_ONE",primary_key="atlas_row_id",secondary_key="reference",identity_values_may_be_overwritten=FALSE),name_method="LAB_D50_TO_MUNSELL_TO_ISCC_NBS",descriptor_method="RULE_BASED_FROM_HLC_AND_STANDARD_NAME",package_versions=list(munsellinterpol=as.character(utils::packageVersion("munsellinterpol"))),status_counts=as.list(counts),records=records)
path<-"designer-layer/ATLAS_Clarus_Designer_Layer_Master_v0_1.json"
jsonlite::write_json(out,path,auto_unbox=TRUE,pretty=FALSE,null="null",digits=NA)
check<-jsonlite::fromJSON(path,simplifyVector=FALSE)
ids<-vapply(check$records,function(x)as.integer(x$atlas_row_id),integer(1))
refs<-vapply(check$records,function(x)as.character(x$reference),character(1))
display<-vapply(check$records,function(x)as.character(x$display_name),character(1))
designer<-vapply(check$records,function(x)as.character(x$designer_name_en),character(1))
stopifnot(length(check$records)==13283L,identical(ids,0:13282),!anyDuplicated(refs),!anyDuplicated(display))
stopifnot(!any(vapply(strsplit(tolower(designer)," +"),function(words)anyDuplicated(words)>0L,logical(1))))
writeLines(paste(digest::digest(file=path,algo="sha256",serialize=FALSE),basename(path)),"designer-layer/SHA256_DESIGNER_LAYER.txt")
writeLines(capture.output(utils::sessionInfo()),"designer-layer/R_sessionInfo.txt")
