# Copyright (C) 2026 remohexa
# SPDX-License-Identifier: GPL-3.0
# Github: https://github.com/remohexa/rematrix-gallery

import shutil
from typing import Optional
from fastapi import (
    FastAPI,
    Form,
    Depends,
    Request,
    UploadFile,
    Response,
)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import (
    FileResponse,
    HTMLResponse,
    PlainTextResponse,
    StreamingResponse,
)
from db import db_calls
from sqlalchemy.orm import Session
from models import *
from utils.encryption import PasswordHashing
from utils.utils import *
import os, magic
from utils.public_vars import PublicVars
from contextlib import asynccontextmanager
from typing import AsyncGenerator

pwdhs = PasswordHashing()

__run_enc_key = f"{os.urandom(32)}"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # init stuff
    if PublicVars.Low_end_mode:
        db_calls.cache_all_media_onstart()
    yield
    # shutdown stuff


U = Utils()
app = FastAPI(lifespan=lifespan)

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://127.0.0.1:5500"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
Etags = Etags_model()


def get_db():
    db = db_calls.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def checkCookieHeaders(
    req: Request,
    res,
    dbInst: db_calls,
    safe_fail: bool = False,
):
    cookiesInst = Cookies_Handler(dbInst)
    cc = req.cookies.get("jwt")
    if not cc:
        if safe_fail:
            return -1
        else:
            raise CustomException(
                code=401,
            )
    else:
        res = cookiesInst.Check_cookie(cc)
        if res != False and res != -1:
            return res
        else:
            if safe_fail:
                return -1
            else:
                raise CustomException(
                    code=401,
                )

    # if not req.headers.__contains__("t"):
    #     if safe_fail:
    #         return -1
    #     else:
    #         raise CustomException(
    #             code=401,
    #         )
    # else:
    #     res = cookiesInst.Check_cookie(req.headers["t"])
    #     if res != False and res != -1:
    #         return res
    #     else:
    #         if safe_fail:
    #             return -1
    #         else:
    #             raise CustomException(
    #                 code=401,
    #             )


@app.get("/a/logout")
def logout(res: Response, req: Request, db: Session = Depends(get_db)):
    dbInst = db_calls(db=db, secret=__run_enc_key)
    cookiesInst = Cookies_Handler(dbInst)
    cc = req.cookies.get("jwt")
    deleted = False
    if cc:
        cc_res = cookiesInst.Delete_cookie(cc)
        if cc_res:
            deleted = True
    res.delete_cookie(
        key="jwt",
        path="/",
    )
    return {"logged_out": deleted}


@app.post("/a/register")
def register(data: reg_json, response: Response, db: Session = Depends(get_db)):
    dbInst = db_calls(db=db, secret=__run_enc_key)
    cookiesInst = Cookies_Handler(dbInst)
    if not data.username.isalnum():
        raise CustomException(
            code=400, content="Username cannot contain spaces and/or symbols."
        )

    res = dbInst.register_user(data)
    if res == 302:
        raise CustomException(code=400, content="Username is already taken.")
    elif res == -1:
        raise CustomException(code=422, content="Couldn't handle this request.")
    else:
        cc = cookiesInst.Create_cookie(res["matrix_id"])
        cookiesInst.Set_Cookie(matrix_id=res["matrix_id"], res=response)
        return {
            "matrix_id": res["matrix_id"],
            "matrix_key": res["password"],
        }


@app.post("/a/login")
def login(data: login_json, ress: Response, db: Session = Depends(get_db)):
    dbInst = db_calls(db=db, secret=__run_enc_key)
    cookiesInst = Cookies_Handler(dbInst)
    res = dbInst.login_user(data=data)
    if res == data.matrix_id:
        cc = cookiesInst.Set_Cookie(matrix_id=data.matrix_id, res=ress)
        return {
            "matrix_id": data.matrix_id,
        }
    else:
        if res == -1:
            raise CustomException(
                code=401,
                # f"The following MATRIX-ID: `{data.matrix_id}` isn't registered."
                content=f"invalid credentials",
            )
        else:
            raise CustomException(code=401, content=f"invalid credentials")


@app.post("/a/user")
def user_check(req: Request, res: Response, db: Session = Depends(get_db)):
    dbInst = db_calls(db=db, secret=__run_enc_key)
    if req.headers.get("check") == "true":
        return {"matrix_id": checkCookieHeaders(req=req, res=res, dbInst=dbInst)}
    if req.headers.get("username") != None:
        avil = dbInst.does_username_exist(str(req.headers.get("username")))
        if not avil:
            return
        else:
            raise CustomException(code=302)


@app.get("/a/user")
def get_user(req: Request, res: Response, id: str = "", db: Session = Depends(get_db)):
    dbInst = db_calls(db=db, secret=__run_enc_key)
    if (len(id) == 0) or (not U.check_input(id, 30)) or (not U.is_hex(id)):
        raise CustomException(
            422,
        )
    else:
        row = dbInst.get_user(matrix_id=id)
        if row == -1:
            raise CustomException(
                404,
            )
        else:
            return row


@app.post("/a/edit_profile")
def edit_profile_request(
    data: edit_profile, req: Request, res: Response, db: Session = Depends(get_db)
):
    dbInst = db_calls(db=db, secret=__run_enc_key)
    matrix_id = checkCookieHeaders(req=req, res=res, dbInst=dbInst)
    if not U.check_input_list(
        [
            data.pfp,
            data.dc,
            data.tg,
            data.ig,
        ],
        50,
    ):
        raise CustomException(
            422,
        )
    else:
        if data.use_matrix_pfp:
            if not U.check_input_list(
                [
                    data.matrix_pfp.bk_type,
                    data.matrix_pfp.gen_type,
                    data.matrix_pfp.seed,
                    data.matrix_pfp.type,
                ],
                100,
            ):
                raise CustomException(
                    422,
                )
            new_id = dbInst.generate_matrix_pic_media_id(matrix_id=matrix_id, data=data.matrix_pfp, is_pfp=True)  # type: ignore
            if new_id == 400:
                raise CustomException(
                    400,
                    content="You can only choose from [identicon, background, combined] for the image type, and from [delusional, distorted] for the background type.",
                )
            else:
                data.pfp = new_id  # type: ignore
        ___ = dbInst.edit_profile(matrix_id=matrix_id, data=data)
        if ___ == -1:
            raise CustomException(401)
        elif ___ == True:
            return
        else:
            raise CustomException(401)


@app.get("/a/media_hash_query")
async def media_hash_query(
    hash: str, req: Request, res: Response, db: Session = Depends(get_db)
):
    dbInst = db_calls(db=db, secret=__run_enc_key)
    owner_id = checkCookieHeaders(req, res=res, dbInst=dbInst)
    qur = (
        {"uploaded": False}
        if PublicVars.Allow_duplicated_uploads
        else dbInst.query_sha256(hash)
    )
    if qur["uploaded"]:
        if qur["temp"]:
            if qur["owner_id"] != owner_id:
                raise CustomException(
                    302, "Another user had already uploaded this media file."
                )
            else:
                raise CustomException(302, qur["media_id"])  # type: ignore
        else:
            raise CustomException(302)
    else:
        CustomException(200)


@app.post("/a/media_upload")
async def media_upload(
    req: Request,
    res: Response,
    file: UploadFile,
    is_pfp_str: str = Form(),
    db: Session = Depends(get_db),
):
    dbInst = db_calls(db=db, secret=__run_enc_key)
    is_pfp = False
    owner_id = checkCookieHeaders(req, res=res, dbInst=dbInst)
    if not file:
        raise CustomException(422)
    else:
        if (
            file.size  # pyright: ignore[reportOptionalOperand]
            > PublicVars.Max_upload_size
        ):
            raise CustomException(
                413,
                f"Media file cannot exceed: {PublicVars. Max_upload_size}MB",
            )
    te_path = uuid.uuid4()
    temf_path = f"{PublicVars.posts_media_path}/{te_path}"
    temf = open(temf_path, "wb")
    temf.write(await file.read())
    temf.close()
    file_type = magic.from_file(temf_path, mime=True)
    f_sha256 = U.calculate_sha256(temf_path)
    if is_pfp_str == "true":
        is_pfp = True
        qur = {"uploaded": False}
    elif PublicVars.Allow_duplicated_uploads:
        qur = {"uploaded": False}
    else:
        qur = dbInst.query_sha256(f_sha256)
    if file_type not in U.allowed_media_types:
        os.remove(temf_path)
        raise CustomException(422, "Cannot accept this file-type.")
    if qur["uploaded"]:
        os.remove(temf_path)
        if qur["temp"]:
            if qur["owner_id"] != owner_id:
                raise CustomException(
                    302, "Another user had already uploaded this media file."
                )
            else:
                return {"media_id": qur["media_id"]}
        else:
            raise CustomException(302)

    try:
        useragent = str(req.headers["user-agent"])
    except:
        useragent = ""
    dominant_color = U.get_dominant_color(f"{PublicVars.posts_media_path}/{te_path}")

    data = media_model(
        path=f"{PublicVars.posts_media_path}/{te_path}",
        media_name=str(file.filename),
        date=U.get_date()["current"],
        type=file_type,  # type: ignore
        size=int(str(file.size)),
        sha256=f_sha256,
        matrix_id=str(owner_id),
        useragent=useragent,
        is_pfp=is_pfp,
    )
    media_id = dbInst.add_temp_media(
        data, theme=U.get_accent_color(bg=dominant_color, base64_res=True)
    )
    final_temp_path = f"{PublicVars.posts_media_path}/{te_path}"
    save_path = (
        f"{PublicVars.posts_media_path}/{media_id}"
        if not is_pfp
        else f"{PublicVars.pfps_uploaded}/{media_id}"
    )
    shutil.move(
        final_temp_path,
        save_path,
    )
    if media_id == -1:
        raise CustomException(code=422, content="Couldn't handle this request.")
    changing_temp_path = dbInst.update_tempmedia_path(
        media_id=media_id, new_path=save_path
    )
    if not changing_temp_path:
        shutil.move(save_path, final_temp_path)
    return {"media_id": media_id}

    # clean_res = U.metadata_cleaning(
    #     mime=file_type,
    #     path=f"{PublicVars.posts_media_path}/{te_path}",
    #     save_path=f"{PublicVars.posts_media_path}/{media_id}",
    # )
    #
    # Unfortunately due to the resources wise, won't be able to clear the EXIF of the uploaded media.
    # U.metadata_cleaning() isn't completely finished yet though.
    # Currently imageio lib [which I use to cache or lower the res for images and gifs] doesn't hold any metadata. But that doesn't apply to when someone download the media
    # Since that would return the full res file.
    # Anyway, If I or someone would edit this part. Please consider the hashing part, since currently the hash is calculated before removing the metadata.
    # if clean_res != True:


@app.post("/a/post")
def new_post(
    data: new_post_json, req: Request, res: Response, db: Session = Depends(get_db)
):
    if len(data.title) == 0:
        raise CustomException(code=400)
    dbInst = db_calls(db=db, secret=__run_enc_key)
    matrix_id = checkCookieHeaders(req=req, res=res, dbInst=dbInst)
    res0 = dbInst.newpost(data, matrix_id)
    if res0 == 400 or res0 == 401 or res0 == -1:
        raise CustomException(code=400)
    else:
        return res0


@app.get(
    "/a/posts",
    response_model=PostsResponse,
)
def get_global(
    cursor: Optional[str] = None, limit: int = 20, db: Session = Depends(get_db)
):
    dbInst = db_calls(db=db, secret=__run_enc_key)
    return dbInst.getposts(cursor=cursor, limit=limit)


@app.get("/a/post")
def get_post(
    req: Request,
    res: Response,
    id: str,
    metadata: bool = False,
    delete: bool = False,
    db: Session = Depends(get_db),
):
    dbInst = db_calls(db=db, secret=__run_enc_key)
    if id != "":
        if U.is_hex(id[1:]) and len(id) < 20:
            if delete:
                cc = checkCookieHeaders(dbInst=dbInst, req=req, res=res)
                del_res = dbInst.delete_post(post_id=id, matrix_id=cc)
                if del_res:
                    raise CustomException(200)
                else:
                    raise CustomException(404)

            else:
                query = dbInst.getpost(post_id=id, metadata=metadata)
                if not query:
                    raise CustomException(404, "")
                return query
    raise CustomException(404, "")


@app.get("/a/media")
def get_media(
    req: Request,
    res: Response,
    id: str,
    full_res: Optional[bool] = False,
    db: Session = Depends(get_db),
):
    if Etags.List.__contains__(req.headers.get("If-None-Match")):
        return Response(status_code=304)
    if not U.check_input(id, 40):
        return Response(status_code=404)
    dbInst = db_calls(db=db, secret=__run_enc_key)
    try:
        row = dbInst.query_media(media_id=id)
        if row and row != None:
            if row.deleted or row.disabled:
                return Response(status_code=404)
            if row.temp:
                CCres = checkCookieHeaders(
                    req=req, res=res, safe_fail=True, dbInst=dbInst
                )
                if CCres != row.matrix_id:
                    return Response(status_code=404)
            if full_res or (not str(row.type).__contains__("image")):
                etag = U.Etag_str(f"Full_{row.sha256}")
                Etags.List.append(etag)
                return FileResponse(f"{row.path}", media_type=row.type, headers={"Etag": etag})  # type: ignore
            else:
                etag = U.Etag_str(f"{row.sha256}")
                Etags.List.append(etag)
                thumb = U.thumbnail(
                    f"{row.path}", type=row.type, media_id=id, cache_only=False
                )
                if thumb["error"] != False:  # type: ignore
                    dbInst.increse_media_error(media_id=id, error=thumb["error"])  # type: ignore
                    raise CustomException(404)
                return StreamingResponse(thumb["buffer"], media_type=thumb["type"], headers={"Etag": etag})  # type: ignore

        else:
            return Response(status_code=404)
    except Exception as e:
        U.print_stuff(
            error=True,
            text=f"Error at get_media() [rematrix_api.py] -> '{e}'\nProbably this happened becuase media path mismatch, consider looking at db_calls.fix_db_working_directory() [db.py]",
        )
        raise CustomException(404)


# ---------------------Misc-----------------------
@app.get("/a/gen_rematrix_picture")
def gen_pic(
    req: Request,
    res: Response,
    data: gen_img = Depends(),
    db: Session = Depends(get_db),
):

    dbInst = db_calls(db=db, secret=__run_enc_key)
    if not PublicVars.Allow_no_auth_generation:
        checkCookieHeaders(req=req, res=res, dbInst=dbInst)
    if not U.check_input_list([data.seed, data.bk_type, data.gen_type, data.type], 100):
        raise CustomException(422)
    if data.type not in ["identicon", "background", "combined"] or data.bk_type not in [
        "delusional",
        "distorted",
    ]:
        raise CustomException(
            400,
            content="You can only choose from [identicon, background, combined] for the image type, and from [delusional, distorted] for the background type.",
        )
    else:
        if data.gen_type == "temp":
            img = U.generate_picture(
                height=PublicVars.Generated_picture_preview_height,
                width=PublicVars.Generated_picture_preview_width,
                upscale_height=PublicVars.Generated_picture_preview_upscale_height,
                upscale_width=PublicVars.Generated_picture_preview_upscale_width,
                seed=data.seed,
                type=data.type,  # type: ignore
                bk_type=data.bk_type,  # type: ignore
                pixelated_effect=data.pixelated_effect,
                cyber_effect=data.cyber_effect,
                early_internet_effect=data.early_internet_effect,
            )
            return StreamingResponse(img["buffer"], media_type=img["type"], headers={"Seed": img["exif"]["seed"]})  # type: ignore
        else:
            raise CustomException(400)


@app.get("/a/check_connection")
def ____(req: Request, res: Response, db: Session = Depends(get_db)):
    dbInst = db_calls(secret=__run_enc_key, db=db)
    ress = checkCookieHeaders(req=req, res=res, safe_fail=True, dbInst=dbInst)
    if ress != -1:
        raise CustomException(200, ress)
    else:
        raise CustomException(200, "")


# -------------------Captive portal----------------------
if PublicVars.Fastapi_Serving_captive_portal:

    def portal_redirect():
        return Response(
            status_code=302, headers={"Location": f"http://{PublicVars.Index_url}/"}
        )

    @app.get("/gen_204")
    def gen_204():
        return portal_redirect()

    @app.get("/generate_204")
    def generate_204():
        return portal_redirect()

    @app.get("/hotspot-detect.html")
    def apple_hotspot():
        return portal_redirect()

    @app.get("/library/test/success.html")
    def apple_success():
        return portal_redirect()

    @app.get("/connecttest.txt")
    def windows_connect():
        return portal_redirect()

    @app.get("/ncsi.txt")
    def windows_ncsi():
        return portal_redirect()

    @app.get("/redirect")
    def windows_redirect():
        return portal_redirect()


# -------------------------------------------------------


@app.exception_handler(404)
async def custom_404_html(request: Request, exc):
    return FileResponse("front/html/404.html", headers={"Etag": U.Etag_str("404.html")})


# ----------------Serving-The-Front-End-------------------
if PublicVars.Fastapi_Serving_FrontEnd:
    app.mount("/js", StaticFiles(directory="front/js"), name="static-js")
    app.mount("/css", StaticFiles(directory="front/css"), name="static-css")
    app.mount("/assets", StaticFiles(directory="front/assets"), name="static-assets")

    @app.get("/")
    def Serve_index():
        return FileResponse("front/html/index.html")

    html_dir = f"{PublicVars.pwd}/front/html"

    @app.get("/{page}")
    def Serve_html(page: str, req: Request):
        page = page.replace(".html", "")
        path = os.path.join(html_dir, f"{page}.html")
        if not page.isalnum():
            return FileResponse(
                "front/html/404.html", headers={"Etag": U.Etag_str("404.html")}
            )
        elif os.path.isfile(path):
            etag = U.Etag_str(path)
            if Etags.List.__contains__(req.headers.get("If-None-Match")):
                return Response(status_code=304)
            Etags.List.append(etag)
            return FileResponse(path, headers={"Etag": U.Etag_str(path)})
        else:
            return FileResponse(
                "front/html/404.html", headers={"Etag": U.Etag_str("404.html")}
            )


# -------------------------------------------------------


class CustomException(Exception):
    def __init__(self, code: int, content: str = ""):
        self.code = code
        self.content = content


@app.exception_handler(CustomException)
async def customexception(request: Request, exc: CustomException):
    return PlainTextResponse(
        status_code=exc.code,
        content=exc.content,
    )


#
