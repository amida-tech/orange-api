FROM        centos:centos7
MAINTAINER  Harry Rickards <rickards@mit.edu>

# Enable EPEL, zeromq, python and build deps
RUN yum -y update; yum clean all
RUN yum -y install epel-release; yum clean all
RUN yum -y install zeromq zeromq-devel; yum clean all
RUN yum -y install python-devel python-pip; yum clean all
RUN yum -y install gcc; yum clean all

# Initially install dependencies (do this before
# copying app code for better caching)
WORKDIR /src/
COPY requirements.txt /src/requirements.txt
RUN  pip install -r requirements.txt

# Bundle app source
COPY . /src

EXPOSE 4242
CMD ["python", "matcher_rpc.py", "run"]
