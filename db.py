import sys
from typing import Optional
from sqlalchemy import (
    BigInteger,
    ForeignKey,
    create_engine,
    tuple_,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    MappedAsDataclass,
    column_property,
)
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import Session
from sqlalchemy import Integer, String, create_engine, Boolean, select

from models import *
from utils.encryption import PasswordHashing
from utils.utils import *
import os, shutil
from utils.public_vars import PublicVars
from rich.live import Live
from rich.text import Text

DATABASE_URL = "sqlite:///./database.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_size=40,
    max_overflow=80,
    pool_timeout=10,
    pool_recycle=1800,
)

pwdhs = PasswordHashing()


class Base(MappedAsDataclass, DeclarativeBase):
    pass


# --------------------


class db_calls:
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def __init__(self, secret, db: Session):
        self.db = db
        self.u = Utils()
        self.secret = secret

    # Misc
    def request_new_id(
        self, type: Literal["user", "media", "post"], id: int = 0, error: str = ""
    ) -> str:
        if error != "":
            row = db_metadata(
                latest_matrix_id=id if type == "user" else 0,
                latest_media_id=id if type == "media" else 0,
                latest_post_id=id if type == "post" else 0,
                error=error,
                at=self.u.get_date()["current"],
            )
            self.db.add(row)
            self.db.commit()
            self.db.refresh(row)
            return "Assigned? idk nothing to put here really."
        row = self.db.query(db_metadata).filter(db_metadata.pm == 0).first()
        if not row:
            first_row = db_metadata()
            self.db.add(first_row)
            self.db.commit()
            self.db.refresh(first_row)
            row = self.db.query(db_metadata).filter(db_metadata.pm == 0).first()
        res_id = ""
        if type == "user":
            res_id = hex(row.latest_matrix_id)  # type: ignore
            row.latest_matrix_id = row.latest_matrix_id + 1  # type: ignore
        elif type == "media":
            res_id = hex(row.latest_media_id)  # type: ignore
            row.latest_media_id = row.latest_media_id + 1  # type: ignore
        else:  # type == "post"
            res_id = hex(row.latest_post_id)  # type: ignore
            row.latest_post_id = row.latest_post_id + 1  # type: ignore
        self.db.commit()
        self.db.refresh(row)
        return res_id

    def secure_text(
        self, encrypt: Optional[str] = None, decrypt: Optional[str] = None
    ) -> str | None:
        if encrypt:
            return self.u.encrypt(str(encrypt), self.secret)
        if decrypt:
            return self.u.decrypt(str(decrypt), self.secret)
        return None

    def get_cookie_exp(self, matrix_id: str, newexp: int = -1):
        row = self.db.query(User).filter(User.matrix_id == matrix_id).first()
        if not row:
            return False
        else:
            if newexp != -1:
                row.current_cookie_exp = newexp
                self.db.commit()
                self.db.refresh(row)
                return True
            if row.current_cookie_exp == 0:
                return False
            return row.current_cookie_exp

    def increse_media_error(self, media_id: str, error: str):
        row = (
            self.db.query(serverdata_media)
            .filter(serverdata_media.media_id == media_id)
            .first()
        )
        row2 = self.db.query(Posts).filter(Posts.media_id == media_id).first()
        row3 = self.db.query(User).filter(User.pfp_id == media_id).first()
        try:
            if row:
                old = False
                try:
                    oldjs = self.u.base64_to_dict(row.errors)
                    oldjs["counter"]  # type: ignore
                    old = True
                except:
                    old = False
                if old:
                    oldjs = self.u.base64_to_dict(row.errors)
                    newjs = oldjs
                    newjs["counter"] = oldjs["counter"] + 1  # type: ignore
                    newjs["errors"] = f"{oldjs["errors"]} {error};"  # type: ignore
                    row.errors = self.u.dict_to_base64(newjs)  # type: ignore
                    if newjs["counter"] > 3:  # type: ignore
                        row.disabled = True
                        if row2:
                            row2.deleted = True
                            self.db.commit()
                            self.db.refresh(row2)
                        elif row3:
                            row3.pfp_id = f"p{row3.matrix_id}"
                            self.db.commit()
                            self.db.refresh(row3)
                    self.db.commit()
                    self.db.refresh(row)
                else:
                    row.errors = self.u.dict_to_base64({"counter": 1, "errors": f"{error};"})  # type: ignore
                    self.db.commit()
                    self.db.refresh(row)
                return True
        except Exception as e:
            if row:
                if row2:
                    row2.deleted = True
                    self.db.commit()
                    self.db.refresh(row2)
                row.disabled = True
                self.db.commit()
                self.db.refresh(row)
            Utils.print_stuff(f"Error at increse_media_error() [db.py] -> {e}")
            return False

    # User
    def does_username_exist(self, username: str):
        return (
            True
            if self.db.query(User).filter(User.username == username).first()
            else False
        )

    def register_user(
        self,
        data: reg_json,
    ):

        existing = self.does_username_exist(data.username)
        if existing:
            return 302
        pwdhs = PasswordHashing()
        passwword = self.u.Rand_pass()
        matrixx_id = self.request_new_id(type="user")
        pfp = self.u.gen_default_pfp(matrixx_id)
        media_id = self.add_temp_media(
            data=media_model(
                path=pfp,  # type: ignore
                media_name=f"{matrixx_id}",
                matrix_id=matrixx_id,
                date=self.u.get_date()["current"],
                type="image/png",
                size=os.path.getsize(pfp),  # type: ignore
                sha256=self.u.calculate_sha256(pfp),  # type: ignore
                is_pfp=True,
                generated_data=str(self.u.dict_to_base64(dict={"seed": matrixx_id})),
            ),
            register=True,
        )
        user = User(
            username=data.username,
            hashed_password=pwdhs.hash(passwword),
            matrix_id=matrixx_id,
            date_unix=self.u.get_date()["current"],
            pfp_id=media_id,  # type: ignore
        )
        try:
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        except Exception as e:
            e2 = f"{e} -> db.py at register_user()"
            Utils.print_stuff(text=e2, error=True)
            self.request_new_id(type="user", id=int(matrixx_id, 16), error=e2)
            return -1
        return {"matrix_id": matrixx_id, "password": passwword}

    def generate_matrix_pic_media_id(self, matrix_id: str, data: gen_img, is_pfp):
        if (
            data.type
            not in [
                "identicon",
                "background",
                "combined",
            ]
            or data.bk_type
            not in [
                "delusional",
                "distorted",
            ]
            or not self.u.is_hex(matrix_id)
        ):
            return 400
        if is_pfp:
            temp_path = (
                f"{PublicVars.pfps_user_generated}/{uuid.uuid4()}{uuid.uuid4()}.png"
            )
        else:
            return None
        img_path = self.u.generate_picture(
            height=PublicVars.Generated_picture_saved_height,
            width=PublicVars.Generated_picture_saved_width,
            upscale_height=PublicVars.Generated_picture_saved_upscale_height,
            upscale_width=PublicVars.Generated_picture_saved_upscale_width,
            seed=data.seed,
            type=data.type,  # type: ignore
            bk_type=data.bk_type,  # type: ignore
            pixelated_effect=data.pixelated_effect,
            cyber_effect=data.cyber_effect,  # type: ignore
            early_internet_effect=data.early_internet_effect,
            save_path=temp_path,
        )
        new_media_id = self.add_temp_media(
            data=media_model(
                path=img_path,  # type: ignore
                media_name="Matrix-Picture",
                matrix_id=matrix_id,
                date=self.u.get_date()["current"],
                type="image/png",
                size=os.path.getsize(img_path),  # type: ignore
                is_pfp=True,
                generated_data=str(
                    self.u.dict_to_base64(
                        dict={
                            "seed": data.seed,
                            "type": data.type,
                            "bk_type": data.bk_type,
                            "pixelated_effect": data.pixelated_effect,
                            "cyber_effect": data.cyber_effect,
                            "early_internet_effect": data.early_internet_effect,
                        }
                    )
                ),
                sha256=self.u.calculate_sha256(img_path),
            )  # type: ignore
        )
        new_path = f"{PublicVars.pfps_user_generated}/{new_media_id}"
        shutil.move(temp_path, new_path)
        self.update_tempmedia_path(media_id=new_media_id, new_path=new_path)  # type: ignore
        return new_media_id

    def login_user(
        self,
        data: login_json,
    ):
        # -1 -> not registered | False -> invalid key | String (id) -> all nice and shiny
        user = self.db.query(User).filter(User.matrix_id == data.matrix_id).first()
        if not user:
            return -1
        if not pwdhs.verf(data.matrix_key, str(user.hashed_password)):
            return False
        else:
            return data.matrix_id

    def edit_profile(self, matrix_id, data: edit_profile):
        row = self.db.query(User).filter(User.matrix_id == matrix_id).first()
        if row:
            if data.pfp != "":
                row2 = (
                    self.db.query(serverdata_media)
                    .filter(serverdata_media.media_id == data.pfp)
                    .first()
                )
                if row2:
                    if row2.matrix_id == matrix_id and row2.is_pfp == True:
                        row.pfp_id = row2.media_id
                    else:
                        return -1
                else:
                    return -1
            elif data.reset_pfp:
                row.pfp_id = f"p{matrix_id}"
            socials = [
                {"data": data.ig, "type": "ig"},
                {"data": data.dc, "type": "dc"},
                {"data": data.tg, "type": "tg"},
            ]
            for i in self.u.socials_validate(socials):
                if i["type"] == "ig":
                    row.ig = i["data"]
                elif i["type"] == "tg":
                    row.tg = i["data"]
                elif i["type"] == "dc":
                    row.dc = i["data"]
            if data.ig == "":
                row.ig = ""
            if data.tg == "":
                row.tg = ""
            if data.dc == "":
                row.dc = ""

            self.db.commit()
            self.db.refresh(row)
            return True
        else:
            return False

    def get_user(self, matrix_id: str):
        row = self.db.query(User).filter(User.matrix_id == matrix_id).first()
        if row:
            row2 = (
                self.db.query(Posts)
                .filter(Posts.matrix_id == row.matrix_id)
                .filter(Posts.deleted == False)
                .all()
            )
            posts_list = []
            for i in row2:
                posts_list.append(i.__dict__)
            return {
                "matrix_id": row.matrix_id,
                "username": row.username,
                "date": row.date_unix,
                "pfp": row.pfp_id,
                "ig": row.ig,
                "tg": row.tg,
                "dc": row.dc,
                "posts": posts_list,
            }
        else:
            return -1

    # ServerSide
    def update_tempmedia_path(self, media_id: str, new_path):
        row = (
            self.db.query(serverdata_media)
            .filter(serverdata_media.media_id == media_id)
            .first()
        )
        if not row:
            return False
        else:
            row.path = new_path
            self.db.commit()
            self.db.refresh(row)
            return True

    def add_temp_media(
        self, data: media_model, theme: Optional[str] = None, register=False
    ):
        new_id = (
            f"p{data.matrix_id}"
            if register
            else f"m{self.request_new_id(type='media')}"
        )
        row = serverdata_media(
            media_id=new_id,
            path=data.path,
            media_name=data.media_name,
            matrix_id=data.matrix_id,
            date_unix=data.date,
            type=str(data.type),
            size=data.size,
            device=data.device,
            useragent=data.useragent,
            sha256=data.sha256,
            temp=False if data.is_pfp else True,
            theme=theme,
            is_pfp=data.is_pfp,
            generating_data=data.generated_data,
        )
        try:
            self.db.add(row)
            self.db.commit()
            self.db.refresh(row)
        except Exception as e:
            e2 = f"{e} -> db.py at add_temp_media()"
            Utils.print_stuff(text=e2, error=True)
            if not register:
                self.request_new_id(
                    type="media", id=int(new_id.replace("m", ""), 16), error=e2
                )
            return -1
        return new_id

    def query_media(self, media_id: str):
        try:
            return (
                self.db.query(serverdata_media)
                .filter(serverdata_media.media_id == media_id)
                .first()
            )
        except Exception as e:
            Utils.print_stuff(text=f"{e} - at [db.py] -> query_media()")
            return None

    def media_controls(
        self, check: str = "", chang_tmp: str = "", delete: str = "", temp: bool = False
    ):
        if check != "":
            row = (
                self.db.query(serverdata_media)
                .filter(serverdata_media.media_id == check)
                .first()
            )
            if not row:
                return -1
            else:
                print(row)

    def query_sha256(self, hash):
        template = {
            "uploaded": False,
            "owner_id": "",
            "post_id": "",
            "temp": False,
            "media_id": "",
        }
        qur = (
            self.db.query(serverdata_media)
            .filter(serverdata_media.sha256 == hash)
            .first()
        )
        template["uploaded"] = True if qur else False
        if qur:
            template["owner_id"] = qur.matrix_id
            template["media_id"] = qur.media_id
            template["temp"] = qur.temp
            if qur.temp:
                qur2 = (
                    self.db.query(Posts).filter(Posts.media_id == qur.media_id).first()
                )
                if qur2:
                    template["post_id"] = qur2.post_id
        return template

    # Posts
    def newpost(self, data: new_post_json, matrix_id):
        media_row = (
            self.db.query(serverdata_media)
            .filter(serverdata_media.media_id == data.media_id)
            .first()
        )
        if not media_row:
            return 400
        else:
            if media_row.temp != True or media_row.is_pfp:
                if media_row.is_pfp:
                    return 401
                post_row = (
                    self.db.query(Posts).filter(Posts.media_id == data.media_id).first()
                )
                if post_row:
                    return {
                        "post_id": post_row.post_id,
                        "new": False,
                    }
                return 400
            if str(media_row.matrix_id) != matrix_id:
                return 401
            if not os.path.exists(f"{PublicVars.posts_media_path}/{data.media_id}"):
                return 401
        new_postid = f"p{self.request_new_id(type='post')}"
        post = Posts(
            post_id=new_postid,
            matrix_id=matrix_id,
            title=data.title,
            disc=data.desc,
            date_unix=self.u.get_date()["current"],
            media_id=media_row.media_id,
            type=media_row.type,
        )
        try:
            self.db.add(post)
            media_row.temp = False
            self.db.commit()
            self.db.refresh(media_row)
            self.db.refresh(post)
        except Exception as e:
            e2 = f"{e} -> happend in db.py at newpost()"
            self.request_new_id(
                type="post", id=int(new_postid.replace("p", ""), 16), error=e2
            )
            return -1
        return {
            "post_id": new_postid,
            "new": True,
        }

    def getposts(self, cursor: Optional[str] = None, limit: int = 50):
        # self.make_fake_posts(amount=200)
        # return

        # return
        # Idk but if you're looking at this around the year of 2500 and wondering why this returns nothing even though everything is correct then yeah, I set a hard cap on the cursor unix date to 2050. Change it future human.
        stmt = (
            # select(Posts, serverdata_media.theme)
            # .join(serverdata_media, Posts.media_id == serverdata_media.media_id)
            select(Posts)
            .where(Posts.deleted == False)
            .order_by(Posts.date_unix.desc(), Posts.post_id.desc())
        )
        """
        doing the crusor without encryption:
        if cursor != None and cursor != "":
            if cursor.__contains__(":"):
                cursor_unix = cursor.split(":")[1]
                cursor_post_id = cursor.split(":")[0]
                if self.u.is_int(cursor_unix) and self.u.is_hex(
                    cursor_post_id.replace("p", "")
                ):
                    if len(str(cursor_unix)) < 11:
                        stmt = stmt.where(
                            tuple_(Posts.date_unix, Posts.post_id)
                            < (cursor_unix, cursor_post_id)
                        )
        """
        cursor = self.secure_text(decrypt=cursor)
        if cursor != None:
            cursor_unix = cursor.split(":")[1]
            cursor_post_id = cursor.split(":")[0]
            stmt = stmt.where(
                tuple_(Posts.date_unix, Posts.post_id) < (cursor_unix, cursor_post_id)
            ).where(Posts.deleted == False)
        stmt = stmt.limit(limit)
        posts = self.db.execute(stmt).scalars().all()
        next_cursor = None
        if len(posts) > 1:

            next_cursor = f"{posts[-1].post_id}:{posts[-1].date_unix}"
        return {
            "posts": posts,
            "next_cursor": self.secure_text(encrypt=next_cursor),
        }

        # return (
        #     self.db.execute(select(Posts.post_id))
        #     .scalars()
        #     .all()[index : index + count]
        # )

    def getpost(self, post_id, metadata=False):
        row = self.db.query(Posts).filter(Posts.post_id == post_id).first()
        if row:
            row2 = self.db.query(User).filter(User.matrix_id == row.matrix_id).first()
            post_dict = row.__dict__
            if row2 and not row.deleted:
                post_dict["owner"] = {
                    "username": row2.username,
                    "matrix_id": row2.matrix_id,
                    "pfp": row2.pfp_id,
                    "ig": row2.ig,
                    "tg": row2.tg,
                    "dc": row2.dc,
                }
            else:
                post_dict["matrix_id"] = "0x0"
                post_dict["owner"] = {
                    "username": "Unknown",
                    "matrix_id": "0x0",
                    "pfp": "",
                    "ig": "",
                    "tg": "",
                    "dc": "",
                }
            if metadata and not row.deleted:
                try:
                    media_row = (
                        self.db.query(serverdata_media)
                        .filter(serverdata_media.media_id == row.media_id)
                        .first()
                    )
                    if media_row:
                        post_dict["metadata"] = {
                            "post_id": row.post_id,
                            "owner_id": row.matrix_id,
                            "date": self.u.convert_unixdate(row.date_unix),
                            "media": {
                                "id": media_row.media_id,
                                "owner_id": media_row.matrix_id,
                                "original_name": media_row.media_name,
                                "upload_date": self.u.convert_unixdate(
                                    media_row.date_unix
                                ),
                                "size": self.u.bytes_to_human_redable_size(
                                    media_row.size
                                ),
                                "mime": media_row.type,
                                "sha256": media_row.sha256,
                            },
                        }
                except Exception as e:
                    Utils.print_stuff(error=True, text=f"{e} at [db.py] getpost()")
            post_dict.pop("deleted")
            return post_dict
        else:
            return False

    def delete_post(self, post_id, matrix_id):
        row = self.db.query(Posts).filter(Posts.post_id == post_id).first()
        if row:
            if row.matrix_id == matrix_id:
                row.title = ""
                row.disc = ""
                row.deleted = True
                row2 = (
                    self.db.query(serverdata_media)
                    .filter(serverdata_media.media_id == row.media_id)
                    .first()
                )
                self.db.commit()
                self.db.refresh(row)
                if row2:
                    if row2.matrix_id == matrix_id:
                        path = row2.path
                        try:
                            os.remove(path)
                        except:
                            pass
                        try:
                            os.remove(f"{PublicVars.cached_media}/{row.media_id}")
                        except:
                            pass
                        row2.path = ""
                        row2.media_name = ""
                        row2.deleted = True
                        self.db.commit()
                        self.db.refresh(row2)

                return True

        return False

    # !!!! DEBUGGING ONLY FUNCTIONS [NOT FOOLPROOF] !!!!
    def make_fake_posts(self, amount, media_path):
        for i in range(amount):
            new_postid = f"p{self.request_new_id(type='post')}"
            newmedia_id = self.add_temp_media(
                media_model(
                    type="image/png",
                    sha256=f"{i}",
                    media_name=f"{i}",
                    date=self.u.get_date()["current"],
                    path=media_path,
                    size=0,
                ),
            )
            post = Posts(
                post_id=new_postid,
                matrix_id=f"0x3",
                title=f"{i}",
                disc=f"{i}",
                date_unix=self.u.get_date()["current"],
                media_id=newmedia_id,  # type: ignore
                type=f"{i}",
            )
            self.db.add(post)
            self.db.commit()
            self.db.refresh(post)

    @staticmethod
    def cache_all_media_onstart(db: Session = SessionLocal()):
        timer_s = time.perf_counter()
        Utils.print_stuff(
            f"Caching a lower quality versions of all server media files before starting.",
        )
        Utils.print_stuff(
            f"Usually, this happens on the fly, But since Low_end_mode is `{PublicVars.Low_end_mode}`, it would be a good idea to cache them first."
        )

        rows = db.execute(
            select(
                serverdata_media.media_id, serverdata_media.path, serverdata_media.type
            )
        )
        errors = 0
        done = 0
        other_media = {
            "audio": 0,
            "video": 0,
            "unknown": 0,
        }
        old_cache = len(os.listdir(PublicVars.cached_media))
        Utils.print_stuff(
            f"Previously cached files: {old_cache}",
        )
        with Live(refresh_per_second=4) as live:
            for id, path, ty in rows:
                trimmed_path = path.replace(PublicVars.pwd, "")
                renderable = (
                    Text()
                    .append("     ")
                    .append("[NOTE]", style="bold white on cyan")
                    .append(" ")
                    .append(f"Currently caching:{trimmed_path}", style="cyan")
                )
                live.update(renderable)
                if not str(ty).__contains__("image"):
                    if str(ty).__contains__("audio"):
                        other_media["audio"] = other_media["audio"] + 1
                    elif str(ty).__contains__("video"):
                        other_media["video"] = other_media["video"] + 1
                    else:
                        other_media["unknown"] = other_media["unknown"] + 1
                    continue

                elif len(path) > 3:
                    tumb_res = Utils().thumbnail(
                        image_path=path,
                        media_id=id,
                        type=ty,
                        cache_only=True,
                    )
                    if not tumb_res[0]:  # type: ignore
                        errors += 1
                        objs = Utils.print_stuff(
                            error=True,
                            text=f"Couldn't cache this file: {trimmed_path}",
                            return_objs=True,
                        )
                        live.console.print(objs[0])  # type: ignore

                    else:
                        if tumb_res[1] == 1:  # type: ignore
                            done += 1
            live.console.print(Utils.print_stuff(text=f"There are [{other_media['video']}] videos and [{other_media['audio']}] that currently aren't being handled.", return_objs=True)[0])  # type: ignore
            if other_media["unknown"] > 0:
                live.console.print(Utils.print_stuff(text=f"There's [{other_media['unknown']}] Unknown file types!", warn=True, return_objs=True)[0])  # type: ignore
            renderable2 = (
                Text()
                .append("     ")
                .append("[FINISHED CACHING]", style="bold white on green")
                .append(" ")
                .append(
                    f"Cached {done} files in {round((time.perf_counter() - timer_s),2)} seconds",
                    style="green",
                )
            )
            live.update(renderable2)
        if errors > 0:
            Utils.print_stuff(warn=True, text=f"Couldn't cache {errors} files.")

    @staticmethod
    def fix_db_working_directory(db: Session = SessionLocal()):  # type: ignore
        """
        Let's say. You hosted this for a while, and after gathering some media you changed the working directory to somewhere else
        And since I'm using the full path while adding media to the DB, We'll need to change each row path form the old directory to the new one
        This function exactly does that.
        e.g.
        The old media path is /a/b/c/media/*
        and your media files are now living under /d/e/media/*
        Then, set the old path to "/a/b/c" and the new one to "/d/e".
        """
        MediaQuery = db.query(serverdata_media).all()
        if len(MediaQuery) < 10:
            Utils.print_stuff(error=True, text="Insufficient media rows to operate.")
            return 0
        os.system("clear") if os.name == "posix" else os.system("cls")
        co1 = input(
            f"!!!BACKUP THE DATABASE BEFORE DOING ANYTHING TO IT!!!\nHere's some of the media paths:\n[\n{MediaQuery[0].path}\n{MediaQuery[1].path}\n{MediaQuery[3].path}\n{MediaQuery[4].path}\n{MediaQuery[5].path}\n]\nDo you still need to proceed?\n[0] Cancel\n[1] Proceed\n:"
        )
        os.system("clear") if os.name == "posix" else os.system("cls")
        if co1 == "1":
            old_path = input("Old string path:")
            new_path = input("new string path:")
            os.system("clear") if os.name == "posix" else os.system("cls")
            cho2 = input(
                f'Old="{old_path}"\nNew="{new_path}"\n\nYou are about to change each row.path who starts with "{old_path}"\n\nFrom\n\n{MediaQuery[0].path} \n\nTo\n\n {MediaQuery[0].path.replace(old_path,new_path) if MediaQuery[0].path.startswith(old_path) else MediaQuery[0].path}.\n\n[0] Cancel\n[1] Proceed\n:'
            )
            if cho2 == "1":
                for row in MediaQuery:
                    if row.path.startswith(old_path):
                        row.path = row.path.replace(old_path, new_path)
                db.commit()
                for row in MediaQuery:
                    db.refresh(row)
            else:
                Utils.print_stuff("Exited.")
        else:
            Utils.print_stuff("Exited.")


# Tables
class User(Base):
    __tablename__ = "users"
    matrix_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(length=20), index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    date_unix: Mapped[int] = mapped_column(BigInteger, index=True)
    current_cookie_exp: Mapped[int] = mapped_column(Integer, default=0)
    # -----------------META-----------------
    pfp_id: Mapped[str] = mapped_column(String, default="")
    ig: Mapped[str] = mapped_column(String, default="")
    tg: Mapped[str] = mapped_column(String, default="")
    dc: Mapped[str] = mapped_column(String, default="")


class serverdata_media(Base):
    __tablename__ = "media"
    media_id: Mapped[str] = mapped_column(
        String, unique=True, primary_key=True, index=True
    )
    sha256: Mapped[str] = mapped_column(String, index=True)
    path: Mapped[str] = mapped_column(String)
    media_name: Mapped[str] = mapped_column(String)
    matrix_id: Mapped[str] = mapped_column(String)
    date_unix: Mapped[int] = mapped_column(BigInteger, index=True)
    size: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String)
    device: Mapped[str] = mapped_column(String)
    useragent: Mapped[str] = mapped_column(String)
    temp: Mapped[bool] = mapped_column(Boolean)
    theme: Mapped[Optional[str]] = mapped_column(String)
    is_pfp: Mapped[bool] = mapped_column(Boolean, default=False)
    generating_data: Mapped[str] = mapped_column(String, default="")
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    errors: Mapped[str] = mapped_column(String, default="")
    disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    # Theme scheme -> base64 encoded json -> {"bg":[r,g,b], accent:[r,g,b],textShadow:[r,g,b],contrastRatio:int}


class Posts(Base):
    __tablename__ = "posts"

    post_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    matrix_id: Mapped[str] = mapped_column(String, index=True)
    title: Mapped[str] = mapped_column(String(length=100))
    disc: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String)
    date_unix: Mapped[int] = mapped_column(BigInteger, index=True)
    media_id: Mapped[str] = mapped_column(
        String, ForeignKey("media.media_id"), unique=True
    )
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    theme = column_property(
        select(serverdata_media.theme)
        .where(serverdata_media.media_id == media_id)
        .correlate_except(serverdata_media)
        .scalar_subquery()
    )


class db_metadata(Base):
    __tablename__ = "db_metadata"
    latest_matrix_id: Mapped[int] = mapped_column(Integer, default=1)
    latest_post_id: Mapped[int] = mapped_column(Integer, default=1)
    latest_media_id: Mapped[int] = mapped_column(Integer, default=1)
    error: Mapped[str] = mapped_column(String, default=None, nullable=True)
    at: Mapped[int] = mapped_column(Integer, default=None, nullable=True)
    pm: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, default=0
    )


# ----------------------------------------------

Base.metadata.create_all(bind=engine)
