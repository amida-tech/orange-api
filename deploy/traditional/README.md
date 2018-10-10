##Deployment Scripts
The Orange backend has an accompanying deployment script to get an instance running located in this directory.  The system uses Ansible to automate deployment.  To learn more about Ansible, visit [docs.ansible.com](http://docs.ansible.com/).

Note:  These scripts are designed to work with Red Hat Enterprise Linux 7.0 (or equivalent CentOS).

###Server Instructions

To get a webserver running, you typically need to specify a hosts file, a private key, and the script.  There is a hosts file which can be amended in the `ansible/hosts` directory with your servers.  It is usually required to specify a private key as well.  The below command, when run from the `ansible` directory, will work.

```sh
ansible-playbook playbook.yml -i "hosts/hosts.ini" --private-key="your_key.pem"
```

The server should be running CentOS 7 and have port 80 open to the public. Documentation will then be accessible at `http://SERVER/docs/`, and the API itself at `http://SERVER/api/v1/`.

The playbook `update.yml` can be used to deploy new code changes without having to wipe the server.
