FROM        centos:centos6
MAINTAINER  Harry Rickards <rickards@mit.edu>

# Add elasticsearch yum repo
RUN  rpm --import http://packages.elasticsearch.org/GPG-KEY-elasticsearch
COPY elasticsearch.repo /etc/yum.repos.d/

# Install java and elasticsearch
RUN yum -y update; yum clean all
RUN yum -y install java-1.7.0-openjdk; yum clean all
RUN yum -y install elasticsearch; yum clean all

WORKDIR /usr/share/elasticsearch

# Copy config
COPY elasticsearch.yml /etc/elasticsearch/elasticsearch.yml

EXPOSE 9200
EXPOSE 9300
ENV JAVA_HOME /usr/lib/jvm/jre-1.7.0-openjdk.x86_64/
CMD ["bin/elasticsearch", "-Des.default.path.conf=/etc/elasticsearch"]
