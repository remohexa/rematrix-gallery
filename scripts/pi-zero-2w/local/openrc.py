import os, shutil

if os.path.exists("/srv/rematrix-gallery/rc"):
    exit()
else:
    shutil.rmtree("/run/openrc")
    os.mkdir("/run/openrc")
    ff = open("/run/openrc/softlevel", "+a")
    ff.close()
    with open("/srv/rematrix-gallery/rc", "+a") as f:
        f.write("1")
        f.close()
    os.system("reboot")
