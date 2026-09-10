# models/__init__.py
# Import all models so that SQLAlchemy's metadata knows about every table
# before init_db() calls Base.metadata.create_all().

from app.models.user    import User      # noqa: F401
from app.models.company import Company   # noqa: F401
from app.models.project import Project   # noqa: F401
from app.models.sheet   import Sheet     # noqa: F401
from app.models.pin     import Pin       # noqa: F401
from app.models.comment import Comment   # noqa: F401
from app.models.photo   import Photo     # noqa: F401
from app.models.task    import Task      # noqa: F401
from app.models.markup  import Markup    # noqa: F401
